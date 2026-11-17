import type { NetworkPermissions } from '@franklin/lib';

export const DEFAULT_NETWORK_CONFIG: NetworkPermissions = {
	allowedDomains: ['*'],
	deniedDomains: [],
};
