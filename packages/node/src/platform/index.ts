import type { Platform } from '@franklin/agent/browser';
import type { EnvironmentConfig } from '@franklin/extensions';
import {
	createReconfigurableEnvironment,
	configureFilesystem,
	createWeb,
} from '@franklin/extensions';
import { spawn } from './spawn.js';
import { createNodeFilesystem } from './filesystem.js';
import { getProviders } from '@mariozechner/pi-ai';
import { getOAuthProviders } from '@mariozechner/pi-ai/oauth';
import type { AbsolutePath } from '@franklin/lib';
import os from 'node:os';
import { SandboxedTerminal } from './sandboxed-terminal.js';
import { openExternal } from './open-external.js';
import { createOAuthFlow } from './auth/create-flow.js';

export function createNodePlatform(): Platform {
	const filesystem = createNodeFilesystem();
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
					// TODO: SandboxedTerminal needs appDir for deny-write paths.
					// This should come from the session/agent context, not the platform.
					const terminal = new SandboxedTerminal('/' as AbsolutePath, cfg);
					await terminal.initialize();
					return terminal;
				},
				configureWeb: async (netConfig) => createWeb(netConfig),
			}),
		filesystem,
		getHome: async () => os.homedir(),
		openExternal,
		// TODO: Sandbox
	};
}
