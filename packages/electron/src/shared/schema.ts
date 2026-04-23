import type { Platform } from '@franklin/agent/browser';
import { method, namespace, on, resource, stream } from '@franklin/lib/proxy';
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

const process = namespace({
	exec: method(),
});

const web = namespace({
	fetch: method(),
});

const osInfo = namespace({
	getPlatform: method(),
	getOsVersion: method(),
	getShellInfo: method(),
	getHomeDir: method(),
});

const authFlow = namespace({
	onAuth: on(),
	onProgress: on(),
	login: method(),
});

export const schema = namespace({
	spawn: resource(stream()),
	createFlow: resource(authFlow),
	environment: resource(
		namespace({
			filesystem: filesystem,
			process: process,
			web: web,
			osInfo: osInfo,
			config: method(),
			reconfigure: method(),
		}),
	),
	ai: namespace({
		getOAuthProviders: method(),
		getApiKeyProviders: method(),
	}),
	os: namespace({
		process: process,
		filesystem: filesystem,
		osInfo: osInfo,
		openExternal: method(),
	}),
} satisfies NamespaceShape<Platform>);
