import type { Platform } from '@franklin/agent/browser';

import { schema } from '../shared/schema.js';
import { bindRenderer } from './ipc/bind/index.js';
import { getPreloadBridge } from './ipc/stream.js';

let platform: Platform | null = null;

export function createElectronPlatform(): Platform {
	if (!platform) {
		const bound = bindRenderer(
			'franklin',
			schema,
			getPreloadBridge(),
		) as unknown as Platform;
		let environment: Awaited<ReturnType<Platform['environment']>> | null = null;

		platform = {
			...bound,
			environment: async () => {
				if (!environment) {
					environment = await bound.environment();
				}
				return environment;
			},
		};
	}

	return platform;
}
