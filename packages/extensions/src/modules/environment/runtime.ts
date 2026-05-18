import { createObserver } from '@franklin/lib';
import type { ReconfigurableEnvironment } from './api/types.js';
import type { StateHandle } from '../../algebra/modules/state/index.js';
import type { BaseRuntime } from '../../algebra/runtime/index.js';
import type { EnvironmentState } from './state.js';

/**
 * Private symbol — environment system stashes its `StateHandle<EnvironmentState>`
 * here so the system's `state(runtime)` projection can read it back.
 * Module-private (not re-exported from the package).
 */
export const ENV_STATE: unique symbol = Symbol('environment/state');

export type EnvironmentEvent = {
	readonly type: 'environment-reconfigured';
};

export type EnvironmentRuntime = BaseRuntime & {
	readonly environment: ReconfigurableEnvironment;
	readonly environmentEvents: {
		subscribe(listener: (event: EnvironmentEvent) => void): () => void;
	};
	readonly [ENV_STATE]: StateHandle<EnvironmentState>;
};

export function createEnvironmentRuntime(
	environment: ReconfigurableEnvironment,
): EnvironmentRuntime {
	const environmentEvents = createObserver<[EnvironmentEvent]>();

	const observed: ReconfigurableEnvironment = {
		filesystem: environment.filesystem,
		process: environment.process,
		web: environment.web,
		osInfo: environment.osInfo,
		config: () => environment.config(),
		async reconfigure(config) {
			await environment.reconfigure(config);
			environmentEvents.notify({ type: 'environment-reconfigured' });
		},
		dispose: () => environment.dispose(),
	};

	return {
		environment: observed,
		environmentEvents,
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
		subscribe: (listener: () => void) =>
			environmentEvents.subscribe(() => listener()),
	};
}

export function environmentStateHandle(
	runtime: EnvironmentRuntime,
): StateHandle<EnvironmentState> {
	return runtime[ENV_STATE];
}
