import type { ClientProtocol } from '@franklin/mini-acp';

import { handle, method, proxy, transport } from './descriptors/factories.js';
import type { PreloadBridgeOf } from './api.js';
import type { Platform } from '@franklin/agent/browser';

export const schema = proxy({
	spawn: transport<() => Promise<ClientProtocol>>(),
	environment: handle<Platform['environment']>({
		filesystem: proxy({
			readFile: method(),
			writeFile: method(),
			mkdir: method(),
			access: method(),
			stat: method(),
			readdir: method(),
			exists: method(),
			glob: method(),
			deleteFile: method(),
		}),
	}),
	ai: proxy({
		getOAuthProviders: method(),
		getApiKeyProviders: method(),
	}),
	filesystem: proxy({
		readFile: method(),
		writeFile: method(),
		mkdir: method(),
		access: method(),
		stat: method(),
		readdir: method(),
		exists: method(),
		glob: method(),
		deleteFile: method(),
	}),
});

export type FranklinPreloadBridge = PreloadBridgeOf<typeof schema>;
