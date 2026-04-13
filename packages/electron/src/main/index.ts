import { AuthManager, type Platform } from '@franklin/agent/browser';
import type { WebContents } from 'electron';

import { bindMain } from './ipc/bind/index.js';
import { schema } from '../shared/schema.js';
import { AuthRelay } from './ipc/auth-relay.js';
import { FRANKLIN_PROXY_CHANNEL_NAMESPACE } from '../shared/channels.js';

export interface MainHandle {
	dispose(): Promise<void>;
}

export function initializeMain(
	webContents: WebContents,
	platform: Platform,
): MainHandle {
	new AuthRelay(webContents, new AuthManager(platform));
	return bindMain(FRANKLIN_PROXY_CHANNEL_NAMESPACE, schema, platform, webContents);
}
