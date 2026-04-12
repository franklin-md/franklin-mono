import type { Platform } from '@franklin/agent/browser';
import { method, namespace, resource, stream } from '@franklin/lib/proxy';
import type { NamespaceShape } from '@franklin/lib/proxy';

const filesystem = namespace({
	resolve: method(),
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

const terminal = namespace({
	exec: method(),
});

const web = namespace({
	fetch: method(),
});

export const schema = namespace({
	spawn: resource(stream()),
	environment: resource(
		namespace({
			filesystem: filesystem,
			terminal: terminal,
			web: web,
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
