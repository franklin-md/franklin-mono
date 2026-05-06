import { DEFAULT_NETWORK_CONFIG } from './api/defaults.js';
import type { EnvironmentConfig } from './api/types.js';
import { FILESYSTEM_DENY_ALL, type AbsolutePath } from '@franklin/lib';

export type EnvironmentState = {
	env: EnvironmentConfig;
};

export function emptyEnvironmentState(): EnvironmentState {
	return {
		env: {
			fsConfig: {
				// Placeholder — fail closed unless the environment is configured.
				cwd: '/' as AbsolutePath,
				permissions: FILESYSTEM_DENY_ALL,
			},
			netConfig: {
				allowedDomains: [...DEFAULT_NETWORK_CONFIG.allowedDomains],
				deniedDomains: [...DEFAULT_NETWORK_CONFIG.deniedDomains],
			},
		},
	};
}
