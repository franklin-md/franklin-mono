import type { Platform } from '@franklin/agent/browser';
import type { EnvironmentConfig } from '@franklin/extensions';
import { spawn } from './spawn.js';
import { createNodeFilesystem } from './filesystem.js';
import { EnvironmentFilesystem } from './environment-filesystem.js';
import { getProviders } from '@mariozechner/pi-ai';
import { getOAuthProviders } from '@mariozechner/pi-ai/oauth';
import { createFolderScopedFilesystem } from '@franklin/lib';
import os from 'node:os';

type Args = {
	appDir?: string;
};

export function createNodePlatform(args: Args = {}): Platform {
	const filesystem = createFolderScopedFilesystem(
		args.appDir ?? os.homedir(),
		createNodeFilesystem(),
	);

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
		environment: async (config: EnvironmentConfig) => {
			const envFs = new EnvironmentFilesystem(createNodeFilesystem(), config);
			return {
				filesystem: envFs,
				async config() {
					return envFs.config;
				},
				async reconfigure(partial: Partial<EnvironmentConfig>) {
					if (partial.cwd !== undefined) {
						envFs.setCwd(partial.cwd);
					}
					if (partial.permissions !== undefined) {
						envFs.setPermissions(partial.permissions);
					}
				},
				dispose: async () => {},
			};
		},
		filesystem,
		// TODO: Sandbox
	};
}
