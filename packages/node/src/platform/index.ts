import type { Platform } from '@franklin/agent/browser';
import { spawn } from './spawn.js';
import { createNodeFilesystem } from './filesystem.js';
import { getProviders } from '@mariozechner/pi-ai';
import { getOAuthProviders } from '@mariozechner/pi-ai/oauth';

export function createNodePlatform(): Platform {
	const filesystem = createNodeFilesystem();
	let environment: Awaited<ReturnType<Platform['environment']>> | null = null;

	const noop = async () => {};

	return {
		spawn: async () => {
			const transport = spawn();
			return Object.assign(transport, { dispose: () => transport.close() });
		},
		ai: {
			getOAuthProviders: async () => {
				return getOAuthProviders().map((p) => ({ id: p.id, name: p.name }));
			},
			getApiKeyProviders: async () => getProviders(),
		},
		environment: async () => {
			environment ??= Object.assign({ filesystem }, { dispose: noop });
			return environment;
		},
		filesystem,
		// TODO: Sandbox
	};
}
