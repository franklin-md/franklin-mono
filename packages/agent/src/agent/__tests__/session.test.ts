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
import type { Session } from '../session/types.js';

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
			yield { type: 'turnEnd' as const };
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
		api.registerStore<number>('counter', 0, 'global');
	};
}

// ---------------------------------------------------------------------------
// SessionManager
// ---------------------------------------------------------------------------

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
			const manager = new SessionManager(createTestTransport, [
				counterExtension(),
			]);

			const session = track(await manager.new());

			expect(typeof session.sessionId).toBe('string');
			expect(session.sessionId.length).toBeGreaterThan(0);
			expect(session.agent).toBeDefined();
		});

		it('creates independent sessions with separate stores', async () => {
			const manager = new SessionManager(createTestTransport, [
				counterExtension(),
			]);

			const s1 = track(await manager.new());
			const s2 = track(await manager.new());

			const c1 = s1.agent.stores.stores.get('counter')!.store;
			const c2 = s2.agent.stores.stores.get('counter')!.store;

			c1.set(() => 42);
			expect(c2.get()).toBe(0);
		});

		it('passes systemPrompt through to setContext', async () => {
			const manager = new SessionManager(createTestTransport, [
				counterExtension(),
			]);

			const session = track(
				await manager.new({ systemPrompt: 'You are helpful' }),
			);

			// The ctx extension should have captured the system prompt
			const ctx = getCtx(session);
			expect(ctx.history.systemPrompt).toBe('You are helpful');
		});

		it('ctx extension shadows initial context', async () => {
			const manager = new SessionManager(createTestTransport, []);

			const session = track(await manager.new({ systemPrompt: 'test' }));
			const ctx = getCtx(session);

			expect(ctx.history.systemPrompt).toBe('test');
			expect(ctx.history.messages).toEqual([]);
			expect(ctx.tools).toEqual([]);
		});
	});

	describe('get', () => {
		it('retrieves a session by ID', async () => {
			const manager = new SessionManager(createTestTransport, [
				counterExtension(),
			]);

			const session = track(await manager.new());
			const retrieved = manager.get(session.sessionId);

			expect(retrieved).toBe(session);
		});

		it('throws for unknown session ID', () => {
			const manager = new SessionManager(createTestTransport, [
				counterExtension(),
			]);

			expect(() => manager.get('nonexistent')).toThrow(
				'Session nonexistent not found',
			);
		});
	});

	describe('child', () => {
		it('creates a child with copied private stores', async () => {
			const manager = new SessionManager(createTestTransport, [
				counterExtension(),
			]);

			const parent = track(await manager.new());
			const parentCounter = parent.agent.stores.stores.get('counter')!.store;
			parentCounter.set(() => 10);

			const child = track(await manager.child(parent.sessionId));
			const childCounter = child.agent.stores.stores.get('counter')!.store;

			// Child starts with a snapshot of parent's state
			expect(childCounter.get()).toBe(10);

			// But mutations are independent
			childCounter.set(() => 99);
			expect(parentCounter.get()).toBe(10);
			expect(childCounter.get()).toBe(99);
		});

		it('shares global stores between parent and child', async () => {
			const manager = new SessionManager(createTestTransport, [
				sharedCounterExtension(),
			]);

			const parent = track(await manager.new());
			const child = track(await manager.child(parent.sessionId));

			const parentCounter = parent.agent.stores.stores.get('counter')!.store;
			const childCounter = child.agent.stores.stores.get('counter')!.store;

			parentCounter.set(() => 42);
			expect(childCounter.get()).toBe(42);

			childCounter.set(() => 100);
			expect(parentCounter.get()).toBe(100);
		});

		it('starts a fresh conversation (no history from parent)', async () => {
			const manager = new SessionManager(createTestTransport, []);

			const parent = track(
				await manager.new({ systemPrompt: 'parent prompt' }),
			);

			const child = track(await manager.child(parent.sessionId));
			const childCtx = getCtx(child);

			// Child should have empty history, not parent's
			expect(childCtx.history.systemPrompt).toBe('');
			expect(childCtx.history.messages).toEqual([]);
		});
	});

	describe('fork', () => {
		it('creates a fork with copied stores', async () => {
			const manager = new SessionManager(createTestTransport, [
				counterExtension(),
			]);

			const parent = track(await manager.new());
			const parentCounter = parent.agent.stores.stores.get('counter')!.store;
			parentCounter.set(() => 5);

			const forked = track(await manager.fork(parent.sessionId));
			const forkedCounter = forked.agent.stores.stores.get('counter')!.store;

			// Forked gets snapshot of parent's store state
			expect(forkedCounter.get()).toBe(5);

			// Independent after fork
			forkedCounter.set(() => 20);
			expect(parentCounter.get()).toBe(5);
		});

		it('inherits parent systemPrompt by default', async () => {
			const manager = new SessionManager(createTestTransport, []);

			const parent = track(
				await manager.new({ systemPrompt: 'parent prompt' }),
			);
			const forked = track(await manager.fork(parent.sessionId));

			const forkedCtx = getCtx(forked);
			expect(forkedCtx.history.systemPrompt).toBe('parent prompt');
		});

		it('allows overriding systemPrompt on fork', async () => {
			const manager = new SessionManager(createTestTransport, []);

			const parent = track(
				await manager.new({ systemPrompt: 'parent prompt' }),
			);
			const forked = track(
				await manager.fork(parent.sessionId, {
					systemPrompt: 'forked prompt',
				}),
			);

			const forkedCtx = getCtx(forked);
			expect(forkedCtx.history.systemPrompt).toBe('forked prompt');
		});
	});

	describe('rewind', () => {
		it('truncates ctx messages and calls setContext', async () => {
			const setContextCalls: unknown[] = [];

			function trackingTransport(): ClientProtocol {
				const { a, b } = createDuplexPair();
				const clientTransport = a as unknown as ClientProtocol;
				const agentTransport = b as unknown as AgentProtocol;

				createAgentConnection(agentTransport).bind({
					async initialize() {
						return {};
					},
					async setContext(params) {
						setContextCalls.push(params);
						return {};
					},
					async *prompt() {
						yield { type: 'turnEnd' as const };
					},
					async cancel() {
						return;
					},
				});
				return clientTransport;
			}

			const manager = new SessionManager(trackingTransport, []);

			const session = track(await manager.new({ systemPrompt: 'test' }));

			// Manually populate the tracker with messages
			// (simulating what would happen after actual prompt/update cycles)
			const { tracker } = session;
			tracker.append({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			});
			tracker.append({
				role: 'assistant',
				content: [{ type: 'text', text: 'hi' }],
			});
			tracker.append({
				role: 'user',
				content: [{ type: 'text', text: 'how are you?' }],
			});
			tracker.append({
				role: 'assistant',
				content: [{ type: 'text', text: 'good' }],
			});

			// Rewind to message index 2 (keep first 2 messages: user + assistant)
			await manager.rewind(session.sessionId, 2);

			// setContext was called: once for new(), once for rewind
			expect(setContextCalls.length).toBe(2);
			const rewindCtx = setContextCalls[1] as {
				ctx: { history: { systemPrompt: string; messages: unknown[] } };
			};
			expect(rewindCtx.ctx.history.systemPrompt).toBe('test');
			expect(rewindCtx.ctx.history.messages).toHaveLength(2);

			// The ctx store should also reflect the rewind
			// (setContext handler in ctxExtension replaces history)
			const ctx = getCtx(session);
			expect(ctx.history.messages).toHaveLength(2);
		});
	});
});
