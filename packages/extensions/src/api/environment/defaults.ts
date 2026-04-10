import type { NetworkConfig } from './types.js';

const DEFAULT_DENIED_LOOPBACK_PORTS = [5005, 5678, 9222, 9229];
const DEFAULT_LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
	allowedDomains: [],
	deniedDomains: DEFAULT_LOOPBACK_HOSTS.flatMap((host) =>
		DEFAULT_DENIED_LOOPBACK_PORTS.map((port) => `${host}:${port}`),
	),
};
