import type { Platform } from '@franklin/agent/browser';

import { schema } from '../shared/schema.js';
import { bindRenderer } from './ipc/bind/index.js';

let platform: Platform | null = null;

export function createElectronPlatform(): Platform {
	if (!platform) {
		platform = bindRenderer(schema, window.__franklinIpc) as Platform;
	}

	return platform;
}
