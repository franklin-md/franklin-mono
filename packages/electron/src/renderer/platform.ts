import type { Platform } from '@franklin/agent/browser';

import { schema } from '../shared/schema.js';
import { bindRenderer } from './ipc/bind/index.js';
import { getPreloadBridge } from './ipc/stream.js';

let platform: Platform | null = null;

export function createElectronPlatform(): Platform {
	if (!platform) {
		platform = bindRenderer(
			'franklin',
			schema,
			getPreloadBridge(),
		) as unknown as Platform;
	}

	return platform;
}
