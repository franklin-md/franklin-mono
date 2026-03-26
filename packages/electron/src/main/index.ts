import { AuthManager, type Platform } from '@franklin/agent/browser';
import type { WebContents } from 'electron';

import { bindMain } from './ipc/bind/index.js';
import { schema } from '../shared/schema.js';
import { AuthRelay } from './ipc/auth-relay.js';

export interface MainHandle {
	dispose(): Promise<void>;
}

export function initializeMain(
	webContents: WebContents,
	platform: Platform,
): MainHandle {
	new AuthRelay(webContents, new AuthManager(platform));
	return bindMain('franklin', schema, platform, webContents);
}
