import type { EnvironmentConfig } from '../api/environment/types.js';

export type EnvironmentState = {
	env: EnvironmentConfig;
};

export function emptyEnvironmentState(): EnvironmentState {
	return {
		env: {
			fsConfig: {
				cwd: '.',
				permissions: { allowRead: [], allowWrite: [] },
			},
			netConfig: { allowedDomains: [], deniedDomains: [] },
		},
	};
}
