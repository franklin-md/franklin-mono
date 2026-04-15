import type { Platform } from '@franklin/agent/browser';
import type { EnvironmentConfig } from '@franklin/extensions';
import {
	createReconfigurableEnvironment,
	configureFilesystem,
} from '@franklin/extensions';

import type { App } from 'obsidian';
import { createStubTerminal, createStubWeb } from './stubs.js';
import { createNodeFilesystem, createNodePlatform } from '@franklin/node';
import { createObsidianFilesystem } from './filesystem/obsidian.js';

export function createObsidianPlatform(app: App): Platform {
	const nodePlatform = createNodePlatform();

	return {
		spawn: async () => {
			throw new Error('Spawn is not available in Obsidian');
		},
		ai: {
			getOAuthProviders: async () => [],
			getApiKeyProviders: async () => [],
		},
		createFlow: async () => {
			throw new Error('OAuth flow is not available in Obsidian');
		},
		environment: (config: EnvironmentConfig) =>
			createReconfigurableEnvironment({
				config,
				configureFilesystem: async (fsConfig) =>
					configureFilesystem(
						createObsidianFilesystem(app.vault, createNodeFilesystem()),
						fsConfig,
					),
				configureTerminal: async () => createStubTerminal(),
				configureWeb: async () => createStubWeb(),
			}),
		filesystem: nodePlatform.filesystem,
		openExternal: async (url: string) => {
			window.open(url);
		},
	};
}
