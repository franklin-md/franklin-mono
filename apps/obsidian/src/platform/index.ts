import type { Platform } from '@franklin/agent/browser';
import type { EnvironmentConfig } from '@franklin/extensions';
import {
	createReconfigurableEnvironment,
	configureFilesystem,
	createWeb,
} from '@franklin/extensions';

import type { App } from 'obsidian';
import { createNodeFilesystem, createNodePlatform } from '@franklin/node';
import { createObsidianFilesystem } from './filesystem/obsidian.js';
import { obsidianFetch, obsidianProviderFetch } from './fetch.js';

export function createObsidianPlatform(app: App): Platform {
	const nodePlatform = createNodePlatform({ llmFetch: obsidianProviderFetch });

	return {
		...nodePlatform,
		os: {
			...nodePlatform.os,
			net: {
				...nodePlatform.os.net,
				// Node's fetch uses the ambient fetch (undici), but in a web environement that inherits a browser fetch with CORS etc
				// TODO: Make Node explicitly use undici?
				fetch: obsidianFetch,
			},
		},
		environment: (config: EnvironmentConfig) =>
			createReconfigurableEnvironment({
				config,
				osInfo: nodePlatform.os.osInfo,
				configureFilesystem: async (fsConfig) =>
					configureFilesystem(
						createObsidianFilesystem(app, createNodeFilesystem()),
						fsConfig,
					),
				configureProcess: async () => {
					return {
						exec: async () => {
							return {
								exit_code: 0,
								stdout: 'Process execution is not available in Obsidian',
								stderr: '',
							};
						},
					};
				},
				configureWeb: async (netConfig) => createWeb(netConfig, obsidianFetch),
			}),
	};
}
