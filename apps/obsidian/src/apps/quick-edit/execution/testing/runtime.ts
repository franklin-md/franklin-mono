import { MemoryFilesystem, MemoryOsInfo } from '@franklin/lib';
import { configureFilesystem, createFranklinAgents, createReconfigurableEnvironment } from '@franklin/agent';
import type { AuthManager, EnvironmentFactory, FranklinApp } from '@franklin/agent';
import type { MiniACPConnector } from '@franklin/mini-acp';
import { FileSystemAdapter } from 'obsidian';
import type { App } from 'obsidian';
import { vi } from 'vitest';

export function createQuickEditTestRuntime(connect: MiniACPConnector) {
	const filesystem = new MemoryFilesystem();
	const auth = { getApiKey: async () => 'test-key', entries: () => ({}), onAuthChange: () => () => {} } as unknown as AuthManager;
	const environment: EnvironmentFactory = (config) => createReconfigurableEnvironment({
		config, osInfo: new MemoryOsInfo(),
		configureFilesystem: async (config) => configureFilesystem(filesystem, config),
		configureProcess: async () => ({ exec: async () => { throw new Error('Unexpected process'); } }),
		configureWeb: async () => ({ fetch: async () => { throw new Error('Unexpected network request'); } }),
	});
	const dispose = vi.fn(async () => {});
	const cancel = vi.fn(async () => {});
	const createAgent: FranklinApp['createAgent'] = async ({ extensions, state }) => {
		const { runtime } = await createFranklinAgents({ connect, auth, environment, extensions }).create({ state });
		const originalDispose = runtime.dispose.bind(runtime);
		const originalCancel = runtime.cancel.bind(runtime);
		runtime.dispose = async () => { await dispose(); await originalDispose(); };
		runtime.cancel = async () => { await cancel(); await originalCancel(); };
		return runtime;
	};
	const adapter = new FileSystemAdapter();
	vi.spyOn(adapter, 'getBasePath').mockReturnValue('/vault');
	const app = { vault: { adapter, configDir: '.obsidian' } } as unknown as App;
	return { filesystem, app, franklin: { auth, createAgent } as FranklinApp, dispose, cancel };
}
