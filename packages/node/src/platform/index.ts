import { OAuthFlow, type Platform } from '@franklin/agent/browser';
import type { EnvironmentConfig } from '@franklin/extensions';
import {
	createReconfigurableEnvironment,
	configureFilesystem,
	createWeb,
} from '@franklin/extensions';
import { spawn } from './spawn.js';
import { createNodeFilesystem } from './filesystem.js';
import { getProviders } from '@mariozechner/pi-ai';
import { getOAuthProvider, getOAuthProviders } from '@mariozechner/pi-ai/oauth';
import { createFolderScopedFilesystem } from '@franklin/lib';
import os from 'node:os';
import { SandboxedTerminal } from './sandboxed-terminal.js';
import { openExternal } from './open-external.js';

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
			return getOAuthProviders().map((p) => ({ id: p.id, name: p.name }));
		},
		getApiKeyProviders: async () => getProviders(),
	};

	return {
		spawn: async () => {
			return spawn();
		},
		ai,
		createFlow: async (providerId: string) => {
			const provider = getOAuthProvider(providerId);
			if (!provider) {
				throw new Error(`OAuth provider "${providerId}" not found`);
			}
			return new OAuthFlow((callbacks) => provider.login(callbacks));
		},
		environment: (config: EnvironmentConfig) =>
			createReconfigurableEnvironment({
				config,
				configureFilesystem: async (fsConfig) =>
					configureFilesystem(createNodeFilesystem(), fsConfig),
				configureTerminal: async (
					cfg,
					previous: SandboxedTerminal | undefined,
				) => {
					if (previous) {
						await previous.setFilesystemConfig(cfg.fsConfig);
						await previous.setNetworkConfig(cfg.netConfig);
						return previous;
					}
					const terminal = new SandboxedTerminal(appDir, cfg);
					await terminal.initialize();
					return terminal;
				},
				configureWeb: async (netConfig) => createWeb(netConfig),
			}),
		filesystem,
		openExternal,
		// TODO: Sandbox
	};
}
