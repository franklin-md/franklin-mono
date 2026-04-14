import type { Platform } from '@franklin/agent/browser';
import type { EnvironmentConfig } from '@franklin/extensions';
import { spawn } from './spawn.js';
import { createNodeFilesystem } from './filesystem.js';
import { EnvironmentFilesystem } from './environment-filesystem.js';
import { EnvironmentWeb } from './web.js';
import { getProviders } from '@mariozechner/pi-ai';
import { getOAuthProviders } from '@mariozechner/pi-ai/oauth';
import { createFolderScopedFilesystem } from '@franklin/lib';
import os from 'node:os';
import { SandboxedTerminal } from './sandboxed-terminal.js';
import { openExternal } from './open-external.js';
import { createOAuthFlow } from './auth/create-flow.js';

type Args = {
	appDir?: string;
};

export function createNodePlatform(args: Args = {}): Platform {
	const appDir = args.appDir ?? os.homedir();
	const filesystem = createFolderScopedFilesystem(
		appDir,
		createNodeFilesystem(),
	);
	const ai = {
		getOAuthProviders: async () => {
			return getOAuthProviders()
				.filter((provider) => provider.usesCallbackServer === true)
				.map((provider) => ({ id: provider.id, name: provider.name }));
		},
		getApiKeyProviders: async () => getProviders(),
	};

	return {
		spawn: async () => {
			const transport = spawn();
			return Object.assign(transport, { dispose: () => transport.close() });
		},
		ai,
		createFlow: createOAuthFlow,
		environment: async (config: EnvironmentConfig) => {
			const envFs = new EnvironmentFilesystem(
				createNodeFilesystem(),
				config.fsConfig,
			);
			const envT = new SandboxedTerminal(appDir, config);
			const envW = new EnvironmentWeb(config.netConfig);
			await envT.initialize();
			return {
				filesystem: envFs,
				terminal: envT,
				web: envW,

				async config() {
					return {
						fsConfig: envFs.config,
						netConfig: envT.getNetworkConfig(),
					};
				},

				async reconfigure(partial: Partial<EnvironmentConfig>) {
					if (partial.fsConfig) {
						// set terminal
						await envT.setFilesystemConfig(partial.fsConfig);
						// set filesystem
						envFs.setCwd(partial.fsConfig.cwd);
						envFs.setPermissions(partial.fsConfig.permissions);
					}
					if (partial.netConfig) {
						// set terminal only
						await envT.setNetworkConfig(partial.netConfig);
						envW.setConfig(partial.netConfig);
					}
				},
				dispose: async () => {},
			};
		},
		filesystem,
		openExternal,
		// TODO: Sandbox
	};
}
