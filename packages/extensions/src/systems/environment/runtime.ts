import { createObserver } from '@franklin/lib';
import type { ReconfigurableEnvironment } from './api/types.js';
import type { BaseRuntime } from '../../algebra/runtime/index.js';
import type { EnvironmentState } from './state.js';

export type EnvironmentRuntime = BaseRuntime<EnvironmentState> & {
	readonly environment: ReconfigurableEnvironment;
};

export function createEnvironmentRuntime(
	environment: ReconfigurableEnvironment,
): EnvironmentRuntime {
	const observer = createObserver();

	const observed: ReconfigurableEnvironment = {
		filesystem: environment.filesystem,
		terminal: environment.terminal,
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
		state: {
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
