import type { EnvironmentConfig } from '../api/environment/types.js';

export type EnvironmentState = {
	env: EnvironmentConfig;
};

export function emptyEnvironmentState(): EnvironmentState {
	return {
		env: { cwd: '.', permissions: { allowRead: [], allowWrite: [] } },
	};
}
