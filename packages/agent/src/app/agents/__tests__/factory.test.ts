import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
	FILESYSTEM_ALLOW_ALL,
	MemoryFilesystem,
	MemoryOsInfo,
	joinAbsolute,
	toAbsolutePath,
} from '@franklin/lib';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/lib/transport';
import {
	createMockMiniACP,
	finishedTurn,
	type MockMiniACP,
} from '@franklin/mini-acp/mock';
import { bindMiniACPRpcAgent } from '@franklin/mini-acp/rpc';
import { FranklinApp } from '../../index.js';
import { AuthManager } from '../../../auth/manager.js';
import { createAuthStore } from '../../../auth/store.js';
import { createReconfigurableEnvironment } from '../../../modules/environment/api/index.js';
import { storeKey } from '../../../modules/store/api/index.js';
import { toolSpec } from '../../../modules/core/api/index.js';
import type { FranklinExtension, FranklinRuntime } from '../../../types.js';
import type { Platform } from '../../../platform.js';
import { documentDownloadPolicy } from '../../../extensions/references/download-policy/configuration.js';

const appDir = toAbsolutePath('/app');
const valueKey = storeKey<'value', string>('value');
const state = {
	core: { llmConfig: { provider: 'test', model: 'model' } },
	env: {
		fsConfig: {
			cwd: toAbsolutePath('/vault'),
			permissions: FILESYSTEM_ALLOW_ALL,
		},
		netConfig: { allowedDomains: [], deniedDomains: [] },
	},
};

function extension(name: string): FranklinExtension {
	return (api) => {
		api.registerStore(valueKey, 'empty', 'private');
		api.registerTool(toolSpec(name, name, z.object({})), {
			execute: () => name,
		});
	};
}

async function prompt(runtime: FranklinRuntime): Promise<void> {
	for await (const _event of runtime.prompt({
		role: 'user',
		content: [{ type: 'text', text: 'hello' }],
	})) {
		// Drain the stream through the real RPC binding.
	}
}

describe('Franklin agent factory', () => {
	it('isolates per-agent extensions and stores from persisted chat, restores chat, and releases temporary agents', async () => {
		const filesystem = new MemoryFilesystem();
		const mocks: MockMiniACP[] = [];
		const environmentDispose = vi.fn(async () => {});
		const os = {
			filesystem,
			osInfo: new MemoryOsInfo(),
			process: { exec: vi.fn() },
			net: { fetch: vi.fn(), listenLoopback: vi.fn() },
			openExternal: vi.fn(),
		};
		const platform: Platform = {
			os,
			ai: { getApiKeyProviders: async () => ['test'] },
			spawn: async () => {
				const { a, b } = createDuplexPair<JsonRpcMessage>();
				const binding = bindMiniACPRpcAgent(b);
				const mock = createMockMiniACP({ defaultTurn: finishedTurn() });
				binding.bind(await mock.connector(binding.remote));
				mocks.push(mock);
				return a;
			},
			environment: async (config) => {
				const environment = await createReconfigurableEnvironment({
					config,
					osInfo: os.osInfo,
					configureFilesystem: async () => filesystem,
					configureProcess: async () => os.process,
					configureWeb: async () => ({ fetch: os.net.fetch }),
				});
				return { ...environment, dispose: environmentDispose };
			},
		};
		const auth = new AuthManager(platform, createAuthStore(filesystem, appDir));
		const app = new FranklinApp({
			platform,
			auth,
			appDir,
			extensions: [extension('chat_tool')],
		});
		await app.start();
		auth.setApiKeyEntry('test', { type: 'apiKey', key: 'secret' });
		const chat = await app.agents.create({ state });
		chat.runtime.getStore(valueKey).set(() => 'saved chat');
		const first = await app.createAgent({
			state,
			extensions: [extension('answer_tool')],
		});
		first.getStore(valueKey).set(() => 'first answer');
		const second = await app.createAgent({
			state,
			extensions: [extension('action_tool')],
		});
		expect(second.getStore(valueKey).get()).toBe('empty');
		expect(chat.runtime.getStore(valueKey).get()).toBe('saved chat');
		expect(app.agents.list()).toEqual([chat]);
		app.settings.set((settings) => {
			settings.documentDownloads.idleTimeoutMs = 120_000;
		});
		for (const runtime of [chat.runtime, first, second])
			expect(runtime.getConfig(documentDownloadPolicy)).toEqual({
				idleTimeoutMs: 120_000,
				totalTimeoutMs: 900_000,
			});

		await Promise.all([chat.runtime, first, second].map(prompt));
		expect(
			mocks.map((mock) => mock.context().tools.map((tool) => tool.name)),
		).toEqual([['chat_tool'], ['answer_tool'], ['action_tool']]);
		expect(
			mocks.every((mock) => mock.context().config.apiKey === 'secret'),
		).toBe(true);

		const sessionsDir = joinAbsolute(appDir, 'sessions');
		const storesDir = joinAbsolute(appDir, 'store');
		await vi.waitFor(async () => {
			expect(await filesystem.readdir(sessionsDir)).toEqual([
				`${chat.details.id}.json`,
			]);
			expect(await filesystem.readdir(storesDir)).toHaveLength(1);
		});
		const saved = new TextDecoder().decode(
			await filesystem.readFile(
				joinAbsolute(sessionsDir, `${chat.details.id}.json`),
			),
		);
		expect(saved).not.toContain('secret');

		await Promise.all([first.dispose(), second.dispose()]);
		expect(environmentDispose).toHaveBeenCalledTimes(2);
		const temporaryContexts = mocks
			.slice(1)
			.map((mock) => mock.calls().setContext.length);
		auth.setApiKeyEntry('test', { type: 'apiKey', key: 'updated' });
		await vi.waitFor(() =>
			expect(mocks[0]?.context().config.apiKey).toBe('updated'),
		);
		expect(
			mocks.slice(1).map((mock) => mock.calls().setContext.length),
		).toEqual(temporaryContexts);

		const restored = new FranklinApp({
			platform,
			auth,
			appDir,
			extensions: [extension('chat_tool')],
		});
		expect((await restored.start()).issues).toEqual([]);
		expect(restored.agents.list()).toHaveLength(1);
		expect(
			restored.agents.get(chat.details.id)?.runtime.getStore(valueKey).get(),
		).toBe('saved chat');
		await Promise.all([
			app.agents.remove(chat.details.id),
			restored.agents.remove(chat.details.id),
		]);
	});
});
