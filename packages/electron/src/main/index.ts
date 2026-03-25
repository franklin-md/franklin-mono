import type { Platform } from '@franklin/agent';
import type { WebContents } from 'electron';

import { bindMain } from './ipc/bind/index.js';
import { schema } from '../shared/schema.js';

export interface MainHandle {
	dispose(): Promise<void>;
}

export function initializeMain(
	webContents: WebContents,
	platform: Platform,
): MainHandle {
	return bindMain('franklin', schema, platform, webContents);
}
