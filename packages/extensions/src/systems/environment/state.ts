import { DEFAULT_NETWORK_CONFIG } from './api/defaults.js';
import type { EnvironmentConfig } from './api/types.js';
import type { AbsolutePath } from '@franklin/lib';

export type EnvironmentState = {
	env: EnvironmentConfig;
};

export function emptyEnvironmentState(): EnvironmentState {
	return {
		env: {
			fsConfig: {
				// Placeholder — always overwritten when the environment is configured.
				cwd: '/' as AbsolutePath,
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
