import type { ClientProtocol } from '@franklin/mini-acp';

import { method, proxy, transport } from './descriptors/factories.js';
import type { PreloadBridgeOf } from './api.js';
import type { Platform } from '@franklin/agent';

export const schema = proxy<Platform>({
	spawn: transport<() => Promise<ClientProtocol>>(),
	filesystem: proxy({
		readFile: method(),
		writeFile: method(),
		mkdir: method(),
		access: method(),
		stat: method({ returns: { isFile: true, isDirectory: true } }),
		readdir: method(),
		exists: method(),
		glob: method(),
		deleteFile: method(),
	}),
});

export type FranklinPreloadBridge = PreloadBridgeOf<Platform>;
