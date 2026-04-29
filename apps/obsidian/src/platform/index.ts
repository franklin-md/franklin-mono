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
	SandboxedProcess,
} from '@franklin/node';
import { createObsidianFilesystem } from './filesystem/obsidian.js';
import { createObservableFilesystem, type AbsolutePath, type WriteListener } from '@franklin/lib';

export function createObsidianPlatform(
	app: App,
	appDir: AbsolutePath,
	writeListener: WriteListener,
): Platform {
	const nodePlatform = createNodePlatform();

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
							fsConfig,
						),
					);
					fs.onWrite(writeListener);
					return fs;
				},
				configureProcess: async (
					config,
					previous: SandboxedProcess | undefined,
				) => {
					process.env.PATH = `/opt/homebrew/bin:${process.env.PATH}`;
					if (previous) {
						await previous.setFilesystemConfig(config.fsConfig);
						await previous.setNetworkConfig(config.netConfig);
						return previous;
					};

					const proc = new SandboxedProcess(appDir, config);
					await proc.initialize();
					return proc;
				},
						
				configureWeb: async (netConfig) =>
					createWeb(netConfig, nodePlatformFetch),
			}),
	};
}
