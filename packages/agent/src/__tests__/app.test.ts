import { describe, expect, it, vi } from 'vitest';
import {
	joinAbsolute,
	MemoryFilesystem,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import type { EnvironmentConfig } from '../modules/environment/index.js';

import { FranklinApp } from '../app/index.js';
import { AuthManager } from '../auth/manager.js';
import { createAuthStore, DEFAULT_AUTH_FILE } from '../auth/store.js';
import type { Platform } from '../platform.js';
import type { FranklinExtension } from '../types.js';
import { StopCode, ZERO_USAGE, type ContextPatch } from '@franklin/mini-acp';
import { createDuplexPair, type JsonRpcMessage } from '@franklin/lib/transport';
import { bindMiniACPRpcAgent } from '@franklin/mini-acp/rpc';
import { emptySessionSnapshot } from '../modules/core/state.js';
import { emptyEnvironmentState } from '../modules/environment/state.js';
import { projectEntries } from '../modules/core/history/project.js';
import { franklinSessionCodec } from '../app/session/codecs/index.js';
import type { FranklinSession } from '../types.js';
import type { SessionEntry } from '../modules/core/history/types.js';

const APP_DIR = '/test/app' as AbsolutePath;

function createPlatform(filesystem = new MemoryFilesystem()): Platform {
	return {
		spawn: vi.fn(async () => {
			throw new Error('not implemented');
		}),
		environment: vi.fn(async (_config: EnvironmentConfig) => {
			throw new Error('not implemented');
		}),
		os: {
			process: {
				exec: vi.fn(async () => ({
					exit_code: 0,
					stdout: '',
					stderr: '',
				})),
			},
			filesystem,
			osInfo: new MemoryOsInfo(),
			openExternal: vi.fn(async () => {}),
			net: {
				listenLoopback: vi.fn(async () => {
					throw new Error('not implemented');
				}),
				fetch: vi.fn(async () => {
					throw new Error('not implemented');
				}),
			},
		},
		ai: {
			getApiKeyProviders: async () => [],
		},
	};
}

describe('FranklinApp extensions option', () => {
	it('accepts an existing extension array', () => {
		const extensions: FranklinExtension[] = [];
		const platform = createPlatform();
		const auth = new AuthManager(
			platform,
			createAuthStore(platform.os.filesystem, APP_DIR),
		);
		const app = new FranklinApp({
			extensions,
			platform,
			appDir: APP_DIR,
			auth,
		});

		expect(app.auth).toBe(auth);
	});
});

describe('FranklinApp.start', () => {
	it('includes auth restore issues before restoring sessions', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed(
			joinAbsolute(APP_DIR, DEFAULT_AUTH_FILE),
			JSON.stringify({ version: 1, data: { anthropic: 'not-an-object' } }),
		);
		const platform = createPlatform(filesystem);
		const auth = new AuthManager(
			platform,
			createAuthStore(platform.os.filesystem, APP_DIR),
		);
		const app = new FranklinApp({
			extensions: [],
			platform,
			appDir: APP_DIR,
			auth,
		});

		const result = await app.start();

		expect(result.issues[0]).toMatchObject({
			kind: 'schema-mismatch',
			version: 1,
		});
	});

	it.each([1, 2, 3])(
		'restores v%i history through app.agents and persists v3 without projecting away the log',
		async (version) => {
			const filesystem = new MemoryFilesystem();
			const platform = createPlatform(filesystem);
			const patches: ContextPatch[] = [];
			platform.spawn = async () => {
				const { a, b } = createDuplexPair<JsonRpcMessage>();
				bindMiniACPRpcAgent(b).bind({
					initialize: async () => {},
					setContext: async (patch) => {
						patches.push(patch);
					},
					async *prompt() {
						yield {
							type: 'turnEnd',
							stopCode: StopCode.Finished,
							stepUsage: ZERO_USAGE,
							usage: ZERO_USAGE,
						};
					},
					async *continue() {},
					cancel: async () => {},
				});
				return a;
			};
			platform.environment = async (config) => ({
				filesystem,
				osInfo: platform.os.osInfo,
				process: platform.os.process,
				web: { fetch: vi.fn() },
				config: async () => structuredClone(config),
				reconfigure: async () => {},
				dispose: async () => {},
			});
			const messages = [
				{
					role: 'user' as const,
					content: [{ type: 'text' as const, text: 'old' }],
				},
				{
					role: 'assistant' as const,
					content: [{ type: 'text' as const, text: 'retained' }],
				},
			];
			const entries: SessionEntry[] = messages.map((message) => ({
				type: 'message' as const,
				message,
			}));
			const value: FranklinSession = {
				...emptyEnvironmentState(),
				store: {},
				details: { visibility: version === 1 ? 'visible' : 'hidden' },
				core: {
					...emptySessionSnapshot(),
					entries,
					llmConfig: { model: 'test-model' },
					usage: {
						...ZERO_USAGE,
						tokens: { ...ZERO_USAGE.tokens, input: 7, total: 7 },
					},
					toolFilter: { disabled: ['lookup'] },
				},
			};
			if (version === 3)
				entries.push({
					type: 'compaction',
					summary: 'summary',
				});
			const { entries: _entries, ...core } = value.core;
			const { details: _details, ...legacy } = value;
			const raw =
				version === 3
					? value
					: {
							...(version === 1 ? legacy : value),
							core: { ...core, messages },
						};
			const path = joinAbsolute(APP_DIR, 'sessions', 'root.json');
			filesystem.seedDir(joinAbsolute(APP_DIR, 'sessions'));
			filesystem.seed(path, JSON.stringify({ version, data: raw }));
			const auth = new AuthManager(
				platform,
				createAuthStore(filesystem, APP_DIR),
			);
			const app = new FranklinApp({
				extensions: [],
				platform,
				appDir: APP_DIR,
				auth,
			});
			try {
				expect(await app.start()).toEqual({ issues: [] });
				const root = app.agents.get('root')!;
				expect(root.runtime.getSession()).toEqual(value.core);
				expect(root.details.visibility).toBe(value.details.visibility);
				for await (const _event of root.runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'next' }],
				})) {
					/* drain stub */
				}
				expect(patches[0]?.messages).toEqual(projectEntries(entries));
				const state = await app.agents.getState('root');
				expect(state?.core.entries.slice(0, entries.length)).toEqual(entries);
				expect(state?.core.usage).toEqual(value.core.usage);
				const fork = await root.runtime.orchestrator.create({
					from: 'root',
					mode: 'fork',
				});
				const child = await root.runtime.orchestrator.create({
					from: 'root',
					mode: 'child',
				});
				expect(fork.runtime.getSession()).toEqual({
					...state!.core,
					usage: ZERO_USAGE,
				});
				expect(child.runtime.getSession()).toEqual({
					entries: [],
					llmConfig: value.core.llmConfig,
					usage: ZERO_USAGE,
					toolFilter: { disabled: [] },
				});
				await vi.waitFor(
					async () => {
						const saved = JSON.parse(
							new TextDecoder().decode(await filesystem.readFile(path)),
						) as unknown;
						expect(saved).toEqual(franklinSessionCodec.encode(state!));
					},
					{ timeout: 2000 },
				);
				const saved = JSON.parse(
					new TextDecoder().decode(await filesystem.readFile(path)),
				) as unknown;
				expect(franklinSessionCodec.decode(saved)).toEqual({
					ok: true,
					value: state,
				});
			} finally {
				await Promise.all(
					app.agents.list().map((entry) => entry.runtime.dispose()),
				);
			}
		},
	);
});
