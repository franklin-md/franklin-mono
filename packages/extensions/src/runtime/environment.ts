import { createObserver } from '@franklin/lib';
import type { Environment } from '../api/environment/types.js';
import type { RuntimeBase } from './types.js';
import type { EnvironmentState } from '../state/environment.js';

export type EnvironmentRuntime = RuntimeBase<EnvironmentState> & {
	readonly environment: Environment;
};

export function createEnvironmentRuntime(
	environment: Environment & { dispose(): Promise<void> },
): EnvironmentRuntime {
	const observer = createObserver();

	const observed: typeof environment = {
		filesystem: environment.filesystem,
		terminal: environment.terminal,
		config: () => environment.config(),
		async reconfigure(config) {
			await environment.reconfigure(config);
			observer.notify();
		},
		dispose: () => environment.dispose(),
	};

	return {
		environment: observed,
		async state(): Promise<EnvironmentState> {
			return { env: { ...(await observed.config()) } };
		},
		async fork(): Promise<EnvironmentState> {
			return { env: { ...(await observed.config()) } };
		},
		async child(): Promise<EnvironmentState> {
			return { env: { ...(await observed.config()) } };
		},
		async dispose(): Promise<void> {
			await observed.dispose();
		},
		subscribe: (listener: () => void) => observer.subscribe(listener),
	};
}
