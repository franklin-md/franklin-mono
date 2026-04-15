import type { Platform } from '@franklin/agent/browser';
import type { EnvironmentConfig } from '@franklin/extensions';
import {
	createReconfigurableEnvironment,
	configureFilesystem,
	createWeb,
} from '@franklin/extensions';

import type { App } from 'obsidian';
import { createStubTerminal } from './stubs.js';
import { createNodeFilesystem, createNodePlatform } from '@franklin/node';
import { createObsidianFilesystem } from './filesystem/obsidian.js';

export function createObsidianPlatform(app: App): Platform {
	const nodePlatform = createNodePlatform();

	return {
		...nodePlatform,
		environment: (config: EnvironmentConfig) =>
			createReconfigurableEnvironment({
				config,
				configureFilesystem: async (fsConfig) =>
					configureFilesystem(
						createObsidianFilesystem(app.vault, createNodeFilesystem()),
						fsConfig,
					),
				configureTerminal: async () => createStubTerminal(),
				configureWeb: async (netConfig) => createWeb(netConfig),
			}),
	};
}
