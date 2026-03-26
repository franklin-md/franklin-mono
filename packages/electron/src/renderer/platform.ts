import type { Platform } from '@franklin/agent/browser';

import { schema } from '../shared/schema.js';
import { bindRenderer } from './ipc/bind/index.js';
import { isLeaseReleased } from './ipc/bind/lease.js';
import { getPreloadBridge } from './ipc/stream.js';

let platform: Platform | null = null;

export function createElectronPlatform(): Platform {
	if (!platform) {
		const bound = bindRenderer('franklin', schema, getPreloadBridge());
		let environment: Awaited<ReturnType<Platform['environment']>> | null = null;

		platform = {
			...bound,
			environment: async () => {
				if (!environment || isLeaseReleased(environment)) {
					environment = await bound.environment();
				}
				return environment;
			},
		};
	}

	return platform;
}
