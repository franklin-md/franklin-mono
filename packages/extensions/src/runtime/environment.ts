import type { Environment } from '../api/environment/types.js';
import type { RuntimeBase } from './types.js';
import type { EnvironmentState } from '../state/environment.js';

export type EnvironmentRuntime = RuntimeBase<EnvironmentState> & {
	readonly environment: Environment;
};

export function createEnvironmentRuntime(
	environment: Environment & { dispose(): Promise<void> },
): EnvironmentRuntime {
	return {
		environment,
		async state(): Promise<EnvironmentState> {
			return { env: { ...(await environment.config()) } };
		},
		async fork(): Promise<EnvironmentState> {
			return { env: { ...(await environment.config()) } };
		},
		async child(): Promise<EnvironmentState> {
			return { env: { ...(await environment.config()) } };
		},
		async dispose(): Promise<void> {
			await environment.dispose();
		},
	};
}
