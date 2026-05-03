import { createObserver } from '@franklin/lib';
import type { ReconfigurableEnvironment } from './api/types.js';
import type { BaseRuntime, StateHandle } from '../../algebra/runtime/index.js';
import type { EnvironmentState } from './state.js';

/**
 * Private symbol — environment system stashes its `StateHandle<EnvironmentState>`
 * here so the system's `state(runtime)` projection can read it back.
 * Module-private (not re-exported from the package).
 */
export const ENV_STATE: unique symbol = Symbol('environment/state');

export type EnvironmentRuntime = BaseRuntime & {
	readonly environment: ReconfigurableEnvironment;
	readonly [ENV_STATE]: StateHandle<EnvironmentState>;
};

export function createEnvironmentRuntime(
	environment: ReconfigurableEnvironment,
): EnvironmentRuntime {
	const observer = createObserver();

	const observed: ReconfigurableEnvironment = {
		filesystem: environment.filesystem,
		process: environment.process,
		web: environment.web,
		osInfo: environment.osInfo,
		config: () => environment.config(),
		async reconfigure(config) {
			await environment.reconfigure(config);
			observer.notify();
		},
		dispose: () => environment.dispose(),
	};

	return {
		environment: observed,
		[ENV_STATE]: {
			async get(): Promise<EnvironmentState> {
				return { env: { ...(await observed.config()) } };
			},
			async fork(): Promise<EnvironmentState> {
				return { env: { ...(await observed.config()) } };
			},
			async child(): Promise<EnvironmentState> {
				return { env: { ...(await observed.config()) } };
			},
		},
		async dispose(): Promise<void> {
			await observed.dispose();
		},
		subscribe: (listener: () => void) => observer.subscribe(listener),
	};
}

export function environmentStateHandle(
	runtime: EnvironmentRuntime,
): StateHandle<EnvironmentState> {
	return runtime[ENV_STATE];
}
