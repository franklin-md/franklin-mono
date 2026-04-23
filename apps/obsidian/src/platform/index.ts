import type { Platform } from '@franklin/agent/browser';
import type { EnvironmentConfig } from '@franklin/extensions';
import {
	createReconfigurableEnvironment,
	configureFilesystem,
	createWeb,
} from '@franklin/extensions';

import type { App } from 'obsidian';
import {
	createNodeFilesystem,
	createNodePlatform,
	nodePlatformFetch,
} from '@franklin/node';
import { createObsidianFilesystem } from './filesystem/obsidian.js';
import { createObservableFilesystem, type WriteListener } from '@franklin/lib';

export function createObsidianPlatform(
	app: App,
	writeListener: WriteListener,
): Platform {
	const nodePlatform = createNodePlatform();

	return {
		...nodePlatform,
		environment: (config: EnvironmentConfig) =>
			createReconfigurableEnvironment({
				config,
				// configureFilesystem: async (fsConfig) => {
				// 	const fs = createObservableFilesystem(
				// 		configureFilesystem(
				// 			createObsidianFilesystem(app, createNodeFilesystem()),
				// 			fsConfig,
				// 		),
				// 	);
				// 	fs.onWrite(writeListener);
				// 	return fs;
				// },
				// configureTerminal: async () => {


				osInfo: nodePlatform.os.osInfo,
				configureFilesystem: async (fsConfig) => {
					const fs = createObservableFilesystem(
						configureFilesystem(
							createObsidianFilesystem(app, createNodeFilesystem()),
							fsConfig,
						),
					);
					fs.onWrite(writeListener);
					return fs;
				},
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
				configureWeb: async (netConfig) =>
					createWeb(netConfig, nodePlatformFetch),
			}),
	};
}
