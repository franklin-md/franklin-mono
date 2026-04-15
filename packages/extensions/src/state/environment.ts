import { DEFAULT_NETWORK_CONFIG } from '../api/environment/defaults.js';
import type { EnvironmentConfig } from '../api/environment/types.js';

export type EnvironmentState = {
	env: EnvironmentConfig;
};

export function emptyEnvironmentState(): EnvironmentState {
	return {
		env: {
			fsConfig: {
				cwd: '.',
				permissions: {
					allowRead: [],
					denyRead: [],
					allowWrite: [],
					denyWrite: [],
				},
			},
			netConfig: {
				allowedDomains: [...DEFAULT_NETWORK_CONFIG.allowedDomains],
				deniedDomains: [...DEFAULT_NETWORK_CONFIG.deniedDomains],
			},
		},
	};
}
