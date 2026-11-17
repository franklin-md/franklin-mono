import { AuthManager, createAuthStore, FranklinApp } from '@franklin/agent';
import type { Platform } from '@franklin/agent';
import { MemoryOsInfo, toAbsolutePath } from '@franklin/lib';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/lib/transport';
import type { MockMiniACP } from '@franklin/mini-acp/mock';
import { bindMiniACPRpcAgent } from '@franklin/mini-acp/rpc';
import { createInboxTestEnvironment } from '../agent/test-environment.js';

export async function createInboxTestApp(mock: MockMiniACP) {
	const setup = createInboxTestEnvironment();
	const appDir = toAbsolutePath('/app');
	let disposedEnvironments = 0;
	const unexpected = async (): Promise<never> => {
		throw new Error('Unexpected host operation');
	};
	const platform: Platform = {
		os: {
			filesystem: setup.filesystem,
			osInfo: new MemoryOsInfo(),
			process: { exec: unexpected },
			net: { fetch: unexpected, listenLoopback: unexpected },
			openExternal: unexpected,
		},
		ai: { getApiKeyProviders: async () => ['test'] },
		environment: async (config) => {
			const environment = await setup.environment(config);
			return {
				...environment,
				dispose: async () => {
					await environment.dispose();
					disposedEnvironments++;
				},
			};
		},
		spawn: async () => {
			const { a, b } = createDuplexPair<JsonRpcMessage>();
			const binding = bindMiniACPRpcAgent(b);
			binding.bind(await mock.connector(binding.remote));
			return a;
		},
	};
	const auth = new AuthManager(
		platform,
		createAuthStore(setup.filesystem, appDir),
	);
	const app = new FranklinApp({ platform, auth, appDir, extensions: [] });
	await app.start();
	return {
		app,
		appDir,
		...setup,
		disposedEnvironments: () => disposedEnvironments,
	};
}
