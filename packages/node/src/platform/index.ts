import type { Platform } from '@franklin/agent/browser';
import type { EnvironmentConfig } from '@franklin/extensions';
import {
	createReconfigurableEnvironment,
	configureFilesystem,
	createWeb,
} from '@franklin/extensions';
import { spawn } from './spawn.js';
import { createNodeFilesystem } from './filesystem.js';
import { nodePlatformFetch } from './fetch.js';
import { getProviders } from '@mariozechner/pi-ai';
import { getOAuthProviders } from '@mariozechner/pi-ai/oauth';
import type { AbsolutePath } from '@franklin/lib';
import os from 'node:os';
import { SandboxedTerminal } from './anthropic/sandboxed-terminal.js';
import { withAnthropicProtected } from './anthropic/protected.js';
import { openExternal } from './open-external.js';
import { createOAuthFlow } from './auth/create-flow.js';
import { UnrestrictedTerminal } from './unrestricted-terminal.js';
import { createNodeOsInfo } from './os-info.js';

type Args = {
	appDir?: AbsolutePath;
};

export function createNodePlatform(args: Args = {}): Platform {
	const appDir = args.appDir ?? (os.homedir() as AbsolutePath);
	const filesystem = createNodeFilesystem();
	const osInfo = createNodeOsInfo();
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
			return spawn();
		},
		ai,
		createFlow: createOAuthFlow,
		environment: (config: EnvironmentConfig) =>
			createReconfigurableEnvironment({
				config,
				osInfo,
				configureFilesystem: async (fsConfig) =>
					configureFilesystem(
						createNodeFilesystem(),
						withAnthropicProtected(fsConfig),
					),
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
				configureWeb: async (netConfig) =>
					createWeb(netConfig, nodePlatformFetch),
			}),
		os: {
			terminal: new UnrestrictedTerminal(process.cwd()),
			filesystem,
			osInfo,
			openExternal,
		},
	};
}
