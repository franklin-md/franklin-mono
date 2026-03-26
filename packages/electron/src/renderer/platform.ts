import type { Platform } from '@franklin/agent/browser';

import { schema } from '../shared/schema.js';
import { bindRenderer } from './ipc/bind/index.js';
import { getPreloadBridge } from './ipc/stream.js';

let platform: Platform | null = null;

export function createElectronPlatform(): Platform {
	if (!platform) {
		// ProxyType<schema> is structurally compatible with Platform but
		// includes extra dispose() on resources that Platform doesn't declare.
		const bound = bindRenderer(
			'franklin',
			schema,
			getPreloadBridge(),
		) as unknown as Platform;
		let environment: Awaited<ReturnType<Platform['environment']>> | null = null;
		let environmentDisposed = false;

		platform = {
			...bound,
			environment: async () => {
				if (!environment || environmentDisposed) {
					environmentDisposed = false;
					environment = await bound.environment();
				}
				return environment;
			},
		};
	}

	return platform;
}
