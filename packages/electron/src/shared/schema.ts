import { method, namespace, resource, stream } from '@franklin/lib/proxy';
import type { ResourceDescriptor } from '@franklin/lib/proxy';

import type { PreloadBridgeOf } from './api.js';

const environmentHandle = namespace({
	filesystem: namespace({
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

const providerHandle = namespace({
	login: method(),
});

const environmentResource: ResourceDescriptor<[], typeof environmentHandle> =
	resource(environmentHandle);

const providerResource: ResourceDescriptor<
	[id: string],
	typeof providerHandle
> = resource(providerHandle);

export const schema = namespace({
	spawn: resource(stream()),
	environment: environmentResource,
	ai: namespace({
		getOAuthProviders: method(),
		getApiKeyProviders: method(),
		getProvider: providerResource,
	}),
	filesystem: namespace({
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
