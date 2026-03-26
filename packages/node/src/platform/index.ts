import type { Platform } from '@franklin/agent/browser';
import { spawn } from './spawn.js';
import { createNodeFilesystem } from './filesystem.js';
import { getProviders } from '@mariozechner/pi-ai';
import { getOAuthProvider, getOAuthProviders } from '@mariozechner/pi-ai/oauth';

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
			getProvider: async (id: string) => {
				const provider = getOAuthProvider(id);
				if (!provider) {
					throw new Error(`Provider ${id} not found`);
				}
				return Object.assign(
					{ login: (...args: Parameters<typeof provider.login>) => provider.login(...args) } as Pick<typeof provider, 'login'>,
					{ dispose: noop },
				);
			},
		},
		environment: async () => {
			environment ??= Object.assign({ filesystem }, { dispose: noop });
			return environment;
		},
		filesystem,
		// TODO: Sandbox
	};
}
