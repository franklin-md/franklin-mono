import { createObserver } from '@franklin/lib';
import type { ReconfigurableEnvironment } from './api/types.js';
import type { RuntimeBase } from '../../algebra/runtime/types.js';
import type { EnvironmentState } from './state.js';

export type EnvironmentRuntime = RuntimeBase<EnvironmentState> & {
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
