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

const loopbackListener = namespace({
	getRedirectUri: method(),
	onRequest: on(),
	respond: method(),
});

export const schema = namespace({
	spawn: resource(stream()),
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
		getApiKeyProviders: method(),
	}),
	os: namespace({
		process: process,
		filesystem: filesystem,
		osInfo: osInfo,
		openExternal: method(),
		net: namespace({
			listenLoopback: resource(loopbackListener),
			fetch: method(),
		}),
	}),
} satisfies NamespaceShape<Platform>);
