import type { Platform } from '@franklin/agent/browser';
import { method, namespace, resource, stream } from '@franklin/lib/proxy';
import type { NamespaceShape } from '@franklin/lib/proxy';

import type { PreloadBridgeOf } from './api.js';

const filesystem = namespace({
	readFile: method(),
	writeFile: method(),
	mkdir: method(),
	access: method(),
	stat: method(),
	readdir: method(),
	exists: method(),
	glob: method(),
	deleteFile: method(),
});

export const schema = namespace({
	spawn: resource(stream()),
	environment: resource(
		namespace({
			filesystem: filesystem,
			config: method(),
			reconfigure: method(),
		}),
	),
	ai: namespace({
		getOAuthProviders: method(),
		getApiKeyProviders: method(),
	}),
	filesystem: filesystem,
} satisfies NamespaceShape<Platform>);

export type FranklinPreloadBridge = PreloadBridgeOf<typeof schema>;
