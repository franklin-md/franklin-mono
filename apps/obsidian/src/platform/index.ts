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

export function createObsidianPlatform(app: App): Platform {
	const nodePlatform = createNodePlatform();

	return {
		...nodePlatform,
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
				configureWeb: async (netConfig) => createWeb(netConfig),
			}),
	};
}
