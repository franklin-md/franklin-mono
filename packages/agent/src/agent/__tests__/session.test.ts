import { afterEach, describe, expect, it } from 'vitest';

import { createDuplexPair } from '@franklin/transport';
import {
	createAgentConnection,
	type MiniACPClient,
	type ClientProtocol,
	type AgentProtocol,
} from '@franklin/mini-acp';
import type { Extension, CoreAPI, StoreAPI } from '@franklin/extensions';
import { SessionManager } from '../session/index.js';
import { emptyCtx, mergeCtx } from '../session/context/utils.js';
import type { IAuthManager } from '@franklin/auth';
import { emptyCtx, mergeCtx, SessionManager } from '../session/index.js';
import type { Session } from '../session/types.js';

function mockAuthManager(): IAuthManager {
	return {
		load: async () => ({}),
		getEntry: async () => undefined,
		getApiKey: async () => undefined,
		setEntry: async () => {},
		removeEntry: async () => {},
		setApiKeyEntry: async () => {},
		removeApiKeyEntry: async () => {},
		setOAuthEntry: async () => {},
		removeOAuthEntry: async () => {},
		loginOAuth: async () => {},
		setApiKey: async () => {},
		onAuthChange: () => () => {},
	};
}

function createMutableAuthManager(
	initialKeys: Record<string, string | undefined> = {},
) {
	const keys = { ...initialKeys };
	const listeners = new Set<
		(provider: string, authKey: string | undefined) => void | Promise<void>
	>();

	const store: IAuthManager & {
		setKey(provider: string, key: string | undefined): void;
		emitChange(provider: string): Promise<void>;
	} = {
		load: async () =>
			Object.fromEntries(
				Object.entries(keys)
					.filter(([, key]) => key !== undefined)
					.map(([provider, key]) => [
						provider,
						{ apiKey: { type: 'apiKey' as const, key: key! } },
					]),
			),
		getEntry: async (provider: string) => {
			const key = keys[provider];
			return key === undefined
				? undefined
				: {
						apiKey: { type: 'apiKey' as const, key },
					};
		},
		getApiKey: async (provider: string) => keys[provider],
		setEntry: async () => {},
		removeEntry: async () => {},
		setApiKeyEntry: async () => {},
		removeApiKeyEntry: async () => {},
		setOAuthEntry: async () => {},
		removeOAuthEntry: async () => {},
		loginOAuth: async () => {},
		setApiKey: async (provider: string, key: string) => {
			keys[provider] = key;
		},
		onAuthChange(
			listener: (
				provider: string,
				authKey: string | undefined,
			) => void | Promise<void>,
		) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		setKey(provider: string, key: string | undefined) {
			keys[provider] = key;
		},
		async emitChange(provider: string) {
			for (const listener of listeners) {
				await listener(provider, keys[provider]);
			}
		},
	};

	return store;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestTransport(): ClientProtocol {
	const { a, b } = createDuplexPair();
	const clientTransport = a as unknown as ClientProtocol;
	const agentTransport = b as unknown as AgentProtocol;

	const handlers: MiniACPClient = {
		async initialize() {
			return {};
		},
		async setContext() {
			return {};
		},
		async *prompt() {
			yield { type: 'turnEnd', stopReason: 'end_turn' as const };
		},
		async cancel() {
			return;
		},
	};

	createAgentConnection(agentTransport).bind(handlers);
	return clientTransport;
}

function getCtx(session: Session) {
	return session.tracker.get();
}

function setSystemPrompt(session: Session, systemPrompt: string) {
	const ctx = getCtx(session);
	session.tracker.apply(
		mergeCtx(ctx, {
			history: {
				systemPrompt,
				messages: ctx.history.messages,
			},
		}),
	);
}

function setConfig(
	session: Session,
	config: NonNullable<ReturnType<typeof getCtx>['config']>,
) {
	session.tracker.apply(mergeCtx(getCtx(session), { config }));
}

// ---------------------------------------------------------------------------
// Test extensions
// ---------------------------------------------------------------------------

function counterExtension(): Extension<CoreAPI & StoreAPI> {
	return (api) => {
		api.registerStore<number>('counter', 0, 'private');
	};
}

function sharedCounterExtension(): Extension<CoreAPI & StoreAPI> {
	return (api) => {
		api.registerStore<number>('counter', 0, 'shared');
	};
}

// ---------------------------------------------------------------------------
// SessionManager
// ---------------------------------------------------------------------------

describe('ctx utils', () => {
	it('emptyCtx returns isolated empty histories', () => {
		const first = emptyCtx();
		const second = emptyCtx();

		first.history.messages.push({
			role: 'user',
			content: [{ type: 'text', text: 'hello' }],
		});

		expect(first.history.messages).toHaveLength(1);
		expect(second.history.messages).toEqual([]);
	});

	it('mergeCtx clones history and config', () => {
		const base: Parameters<typeof mergeCtx>[0] = {
			history: {
				systemPrompt: 'parent prompt',
				messages: [
					{
						role: 'user' as const,
						content: [{ type: 'text' as const, text: 'hello' }],
					},
				],
			},
			config: {
				model: 'gpt-test',
				reasoning: 'high' as const,
			},
		};

		const merged = mergeCtx(base);

		base.history.messages.push({
			role: 'assistant',
			content: [{ type: 'text', text: 'hi' }],
		});
		base.config!.model = 'changed';

		expect(merged.history.messages).toHaveLength(1);
		expect(merged.config).toEqual({
			model: 'gpt-test',
			reasoning: 'high',
		});
	});
});

describe('SessionManager', () => {
	const disposables: { dispose: () => Promise<void> }[] = [];

	afterEach(async () => {
		for (const d of disposables) {
			await d.dispose().catch(() => {});
		}
		disposables.length = 0;
	});

	function track<T extends { agent: { dispose: () => Promise<void> } }>(
		session: T,
	): T {
		disposables.push(session.agent);
		return session;
	}

	describe('new', () => {
		it('creates a session with a unique ID and agent', async () => {
			const manager = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
			);

			const session = track(await manager.new({}));

			expect(typeof session.sessionId).toBe('string');
			expect(session.sessionId.length).toBeGreaterThan(0);
			expect(session.agent).toBeDefined();
		});

		it('creates independent sessions with separate stores', async () => {
			const manager = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
			);

			const s1 = track(await manager.new({}));
			const s2 = track(await manager.new({}));

			const c1 = s1.agent.stores.get('counter')!.store;
			const c2 = s2.agent.stores.get('counter')!.store;

			c1.set(() => 42);
			expect(c2.get()).toBe(0);
		});

		it('ctx extension shadows initial context', async () => {
			const manager = new SessionManager(
				createTestTransport,
				[],
				mockAuthManager(),
			);

			const session = track(await manager.new({}));
			const ctx = getCtx(session);

			expect(ctx.history.systemPrompt).toBe('');
			expect(ctx.history.messages).toEqual([]);
			expect(ctx.tools).toEqual([]);
		});

			it('invalidates existing session api keys when auth changes', async () => {
			const setContextCalls: Array<{
				ctx: { config?: Record<string, unknown> };
			}> = [];
			const authManager = createMutableAuthManager({ anthropic: 'sk-initial' });

			function trackingTransport(): ClientProtocol {
				const { a, b } = createDuplexPair();
				const clientTransport = a as unknown as ClientProtocol;
				const agentTransport = b as unknown as AgentProtocol;

				createAgentConnection(agentTransport).bind({
					async initialize() {
						return {};
					},
					async setContext(params) {
						setContextCalls.push(
							params as { ctx: { config?: Record<string, unknown> } },
						);
						return {};
					},
					async *prompt() {
						yield { type: 'turnEnd', stopReason: 'end_turn' as const };
					},
					async cancel() {
						return;
					},
				});
				return clientTransport;
			}

			const manager = new SessionManager(trackingTransport, [], authManager);
			const session = track(
				await manager.new({
					provider: 'anthropic',
					model: 'claude-opus-4-6',
					reasoning: 'high',
				}),
			);

			authManager.setKey('anthropic', undefined);
			await authManager.emitChange('anthropic');

			expect(setContextCalls).toHaveLength(2);
			expect(setContextCalls[1]!.ctx.config).toEqual({
				provider: 'anthropic',
				model: 'claude-opus-4-6',
				reasoning: 'high',
			});
			expect(getCtx(session).config).toEqual({
				provider: 'anthropic',
				model: 'claude-opus-4-6',
				reasoning: 'high',
			});
		});
	});

	describe('get', () => {
		it('retrieves a session by ID', async () => {
			const manager = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
			);

			const session = track(await manager.new({}));
			const retrieved = manager.get(session.sessionId);

			expect(retrieved).toBe(session);
		});

		it('throws for unknown session ID', () => {
			const manager = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
			);

			expect(() => manager.get('nonexistent')).toThrow(
				'Session nonexistent not found',
			);
		});
	});

	describe('child', () => {
		it('creates a child with fresh private stores', async () => {
			const manager = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
			);

			const parent = track(await manager.new({}));
			const parentCounter = parent.agent.stores.get('counter')!.store;
			parentCounter.set(() => 10);

			const child = track(await manager.child(parent.sessionId));
			const childCounter = child.agent.stores.get('counter')!.store;

			// Child starts fresh (private stores are not copied)
			expect(childCounter.get()).toBe(0);

			// Mutations are independent
			childCounter.set(() => 99);
			expect(parentCounter.get()).toBe(10);
			expect(childCounter.get()).toBe(99);
		});

		it('shares global stores between parent and child', async () => {
			const manager = new SessionManager(
				createTestTransport,
				[sharedCounterExtension()],
				mockAuthManager(),
			);

			const parent = track(await manager.new({}));
			const child = track(await manager.child(parent.sessionId));

			const parentCounter = parent.agent.stores.get('counter')!.store;
			const childCounter = child.agent.stores.get('counter')!.store;

			parentCounter.set(() => 42);
			expect(childCounter.get()).toBe(42);

			childCounter.set(() => 100);
			expect(parentCounter.get()).toBe(100);
		});

		it('starts a fresh conversation (no history from parent)', async () => {
			const manager = new SessionManager(
				createTestTransport,
				[],
				mockAuthManager(),
			);

			const parent = track(await manager.new({}));
			setSystemPrompt(parent, 'parent prompt');

			const child = track(await manager.child(parent.sessionId));
			const childCtx = getCtx(child);

			// Child should have empty history, not parent's
			expect(childCtx.history.systemPrompt).toBe('');
			expect(childCtx.history.messages).toEqual([]);
		});
	});

	describe('fork', () => {
		it('creates a fork with copied stores', async () => {
			const manager = new SessionManager(
				createTestTransport,
				[counterExtension()],
				mockAuthManager(),
			);

			const parent = track(await manager.new({}));
			const parentCounter = parent.agent.stores.get('counter')!.store;
			parentCounter.set(() => 5);

			const forked = track(await manager.fork(parent.sessionId));
			const forkedCounter = forked.agent.stores.get('counter')!.store;

			// Forked gets snapshot of parent's store state
			expect(forkedCounter.get()).toBe(5);

			// Independent after fork
			forkedCounter.set(() => 20);
			expect(parentCounter.get()).toBe(5);
		});

		it('inherits parent systemPrompt by default', async () => {
			const manager = new SessionManager(
				createTestTransport,
				[],
				mockAuthManager(),
			);

			const parent = track(await manager.new({}));
			setSystemPrompt(parent, 'parent prompt');
			const forked = track(await manager.fork(parent.sessionId));

			const forkedCtx = getCtx(forked);
			expect(forkedCtx.history.systemPrompt).toBe('parent prompt');
		});

		it('clones parent history and config on fork', async () => {
			const manager = new SessionManager(
				createTestTransport,
				[],
				mockAuthManager(),
			);

			const parent = track(await manager.new({}));
			setSystemPrompt(parent, 'parent prompt');
			parent.tracker.append({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			});
			setConfig(parent, { model: 'parent-model', reasoning: 'high' });

			const forked = track(await manager.fork(parent.sessionId));

			parent.tracker.append({
				role: 'assistant',
				content: [{ type: 'text', text: 'later' }],
			});
			setConfig(parent, { model: 'changed-model', reasoning: 'low' });

			const forkedCtx = getCtx(forked);
			expect(forkedCtx.history.systemPrompt).toBe('parent prompt');
			expect(forkedCtx.history.messages).toEqual([
				{
					role: 'user',
					content: [{ type: 'text', text: 'hello' }],
				},
			]);
			expect(forkedCtx.config).toEqual({
				model: 'parent-model',
				reasoning: 'high',
			});
		});
	});

	// eslint-disable-next-line vitest/no-commented-out-tests
	// describe('rewind', () => {
	// eslint-disable-next-line vitest/no-commented-out-tests
	// 	it('truncates ctx messages and calls setContext', async () => {
	// 		const setContextCalls: unknown[] = [];

	// 		function trackingTransport(): ClientProtocol {
	// 			const { a, b } = createDuplexPair();
	// 			const clientTransport = a as unknown as ClientProtocol;
	// 			const agentTransport = b as unknown as AgentProtocol;

	// 			createAgentConnection(agentTransport).bind({
	// 				async initialize() {
	// 					return {};
	// 				},
	// 				async setContext(params) {
	// 					setContextCalls.push(params);
	// 					return {};
	// 				},
	// 				async *prompt() {
	// 					yield { type: 'turnEnd' as const };
	// 				},
	// 				async cancel() {
	// 					return;
	// 				},
	// 			});
	// 			return clientTransport;
	// 		}
				createAgentConnection(agentTransport).bind({
					async initialize() {
						return {};
					},
					async setContext(params) {
						setContextCalls.push(params);
						return {};
					},
					async *prompt() {
						yield { type: 'turnEnd', stopReason: 'end_turn' as const };
					},
					async cancel() {
						return;
					},
				});
				return clientTransport;
			}

	// 		const manager = new SessionManager(trackingTransport, []);
			const manager = new SessionManager(
				trackingTransport,
				[],
				mockAuthManager(),
			);

	// 		const session = track(await manager.new());
	// 		setSystemPrompt(session, 'test');
			const session = track(await manager.new({}));
			setSystemPrompt(session, 'test');

	// 		// Manually populate the tracker with messages
	// 		// (simulating what would happen after actual prompt/update cycles)
	// 		const { tracker } = session;
	// 		tracker.append({
	// 			role: 'user',
	// 			content: [{ type: 'text', text: 'hello' }],
	// 		});
	// 		tracker.append({
	// 			role: 'assistant',
	// 			content: [{ type: 'text', text: 'hi' }],
	// 		});
	// 		tracker.append({
	// 			role: 'user',
	// 			content: [{ type: 'text', text: 'how are you?' }],
	// 		});
	// 		tracker.append({
	// 			role: 'assistant',
	// 			content: [{ type: 'text', text: 'good' }],
	// 		});

	// 		// Rewind to message index 2 (keep first 2 messages: user + assistant)
	// 		await manager.rewind(session.sessionId, 2);

	// 		// setContext was called: once for new(), once for rewind
	// 		expect(setContextCalls.length).toBe(2);
	// 		const rewindCtx = setContextCalls[1] as {
	// 			ctx: { history: { systemPrompt: string; messages: unknown[] } };
	// 		};
	// 		expect(rewindCtx.ctx.history.systemPrompt).toBe('test');
	// 		expect(rewindCtx.ctx.history.messages).toHaveLength(2);

	// 		// The ctx store should also reflect the rewind
	// 		// (setContext handler in ctxExtension replaces history)
	// 		const ctx = getCtx(session);
	// 		expect(ctx.history.messages).toHaveLength(2);
	// 	});
	// });
});
