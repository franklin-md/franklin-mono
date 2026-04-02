import type { Platform } from '@franklin/agent/browser';
import type { EnvironmentConfig } from '@franklin/extensions';
import { spawn } from './spawn.js';
import { createNodeFilesystem } from './filesystem.js';
import { EnvironmentFilesystem } from './environment-filesystem.js';
import { getProviders } from '@mariozechner/pi-ai';
import { getOAuthProviders } from '@mariozechner/pi-ai/oauth';
import { createFolderScopedFilesystem } from '@franklin/lib';
import os from 'node:os';
import { SandboxedTerminal } from './sandboxed-terminal.js';

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
			const envFs = new EnvironmentFilesystem(createNodeFilesystem(), config.fsConfig);
			const envT = new SandboxedTerminal(config);
			return {
				filesystem: envFs,
				terminal: envT,

				async config() {
					return {
						fsConfig: envFs.config,
						netConfig: envT.getNetworkConfig(),
					}
				},
				
				async reconfigure(partial: Partial<EnvironmentConfig>) {
					if (partial.fsConfig) {
						// set terminal
						envT.setFilesystemConfig(partial.fsConfig);
						
						// set filesystem
						if (partial.fsConfig.cwd !== undefined) {
							const to_set = partial.fsConfig.cwd;
							envFs.setCwd(to_set);
						}

						if (partial.fsConfig.permissions !== undefined) {
							envFs.setPermissions(partial.fsConfig.permissions);
						}
					};
					if (partial.netConfig) {
						// set terminal only
						envT.setNetworkConfig(partial.netConfig);
					}
				},
				dispose: async () => {},
			};
		},
		filesystem,
		// TODO: Sandbox
	};
}
