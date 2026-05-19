import type { Platform } from '@franklin/agent/browser';
import type { EnvironmentConfig } from '@franklin/agent';
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import {
	createReconfigurableEnvironment,
	configureFilesystem,
	createWeb,
} from '@franklin/agent';
import type { App } from 'obsidian';
import {
	createNodeFilesystem,
	createNodePlatform,
	createConfigureProcess,
	createNodePlatformFetch,
	withAnthropicProtected,
} from '@franklin/node';
import { createObsidianFilesystem } from './filesystem/obsidian.js';
import {
	createObservableFilesystem,
	type AbsolutePath,
	type WriteListener,
} from '@franklin/lib';

export function createObsidianPlatform(
	app: App,
	appDir: AbsolutePath,
	writeListener: WriteListener,
): Platform {
	const nodePlatform = createNodePlatform({ appDir });
	const obsidianFetch = createObsidianFetch();

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
				configureWeb: async (netConfig) => createWeb(netConfig, obsidianFetch),
			}),
		os: {
			...nodePlatform.os,
			net: {
				...nodePlatform.os.net,
				fetch: obsidianFetch,
			},
		},
	};
}

function createObsidianFetch() {
	const httpAgent = new HttpAgent();
	const httpsAgent = new HttpsAgent();
	return createNodePlatformFetch(
		{},
		{
			agent(url) {
				return url.protocol === 'http:' ? httpAgent : httpsAgent;
			},
		},
	);
}
