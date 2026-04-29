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
	withAnthropicProtected,
} from '@franklin/node';
import { createObsidianFilesystem } from './filesystem/obsidian.js';
import {
	createObservableFilesystem,
	type AbsolutePath,
	type WriteListener,
} from '@franklin/lib';
import { createConfigureProcess } from 'packages/node/src/platform/configure-process.js';

export function createObsidianPlatform(
	app: App,
	appDir: AbsolutePath,
	writeListener: WriteListener,
): Platform {
	const nodePlatform = createNodePlatform({ appDir });

	return {
		...nodePlatform,
		environment: (config: EnvironmentConfig) =>
			createReconfigurableEnvironment({
				config,
				osInfo: nodePlatform.os.osInfo,
				configureFilesystem: async (fsConfig) => {
					const fs = createObservableFilesystem(
						configureFilesystem(
							createObsidianFilesystem(app, createNodeFilesystem()),
							withAnthropicProtected(fsConfig),
						),
					);
					fs.onWrite(writeListener);
					return fs;
				},
				...createConfigureProcess(nodePlatform.os.osInfo, appDir),
				configureWeb: async (netConfig) =>
					createWeb(netConfig, nodePlatformFetch),
			}),
	};
}
