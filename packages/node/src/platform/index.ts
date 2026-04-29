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
import { nodeHttpFetch } from './http/fetch.js';
import { getProviders } from '@mariozechner/pi-ai';
import type { AbsolutePath } from '@franklin/lib';
import os from 'node:os';
import { withAnthropicProtected } from './anthropic/protected.js';
import { openExternal } from './open-external.js';
import { createLoopbackListener } from './network/loopback/create.js';
import { createPiStreamFn } from './pi-stream.js';
import { UnrestrictedProcess } from './unrestricted-process.js';
import { createNodeOsInfo } from './os-info.js';
import { createConfigureProcess } from './configure-process.js';

type Args = {
	appDir?: AbsolutePath;
};

export function createNodePlatform(args: Args = {}): Platform {
	const appDir = args.appDir ?? (os.homedir() as AbsolutePath);
	const filesystem = createNodeFilesystem();
	const osInfo = createNodeOsInfo();

	const llmStreamFn = createPiStreamFn({ fetch: nodeHttpFetch });
	const ai = {
		getApiKeyProviders: async () => getProviders(),
	};

	return {
		spawn: async () => {
			return spawn({ streamFn: llmStreamFn });
		},
		ai,
		environment: (config: EnvironmentConfig) =>
			createReconfigurableEnvironment({
				config,
				osInfo,
				configureFilesystem: async (fsConfig) =>
					configureFilesystem(
						createNodeFilesystem(),
						withAnthropicProtected(fsConfig),
					),
				...createConfigureProcess(osInfo, appDir),
				configureWeb: async (netConfig) =>
					createWeb(netConfig, nodePlatformFetch),
			}),
		os: {
			process: new UnrestrictedProcess(process.cwd()),
			filesystem,
			osInfo,
			openExternal,
			net: {
				listenLoopback: createLoopbackListener,
				fetch: nodePlatformFetch,
			},
		},
	};
}
