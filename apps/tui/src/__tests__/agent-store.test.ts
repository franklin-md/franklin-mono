import { describe, expect, it, vi } from 'vitest';

import type {
	AgentConnection,
	AgentStack,
	RequestPermissionRequest,
	SessionNotification,
} from '@franklin/agent';

import { AgentStore } from '../lib/agent-store.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockStack(overrides?: Partial<AgentStack>): AgentStack {
	return {
		prompt: vi.fn(async () => ({ stopReason: 'end_turn' as const })),
		cancel: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
		...overrides,
	} as unknown as AgentStack;
}

function createMockConnection(): AgentConnection {
	return {
		closed: new Promise<void>(() => {}), // never resolves
	} as unknown as AgentConnection;
}

function initStore(
	store: AgentStore,
	stackOverrides?: Partial<AgentStack>,
): { stack: AgentStack } {
	const stack = createMockStack(stackOverrides);
	store._init(stack, 'test-session', createMockConnection());
	return { stack };
}

function agentMessageChunk(
	text: string,
	sessionId = 'test-session',
): SessionNotification {
	return {
		sessionId,
		update: {
			sessionUpdate: 'agent_message_chunk',
			content: { type: 'text', text },
		},
	} as SessionNotification;
}

function agentThoughtChunk(
	text: string,
	sessionId = 'test-session',
): SessionNotification {
	return {
		sessionId,
		update: {
			sessionUpdate: 'agent_thought_chunk',
			content: { type: 'text', text },
		},
	} as SessionNotification;
}

function toolCallNotification(
	toolCallId: string,
	title: string,
	sessionId = 'test-session',
): SessionNotification {
	return {
		sessionId,
		update: {
			sessionUpdate: 'tool_call',
			toolCallId,
			title,
			status: 'in_progress',
		},
	} as SessionNotification;
}

function toolCallUpdateNotification(
	toolCallId: string,
	status: string,
	sessionId = 'test-session',
): SessionNotification {
	return {
		sessionId,
		update: {
			sessionUpdate: 'tool_call_update',
			toolCallId,
			status,
		},
	} as SessionNotification;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgentStore', () => {
	it('starts with idle status and empty items', () => {
		const store = new AgentStore('test');
		const snap = store.snapshot;

		expect(snap.status).toBe('idle');
		expect(snap.items).toEqual([]);
		expect(snap.pendingPermission).toBeNull();
	});

	describe('_handleSessionUpdate', () => {
		it('accumulates agent_message_chunk into streaming item', () => {
			const store = new AgentStore('test');
			store._handleSessionUpdate(agentMessageChunk('hello'));
			store._handleSessionUpdate(agentMessageChunk(' world'));

			const snap = store.snapshot;
			expect(snap.items).toHaveLength(1);
			expect(snap.items[0]).toMatchObject({
				kind: 'agent_message',
				text: 'hello world',
				streaming: true,
			});
		});

		it('accumulates agent_thought_chunk into streaming item', () => {
			const store = new AgentStore('test');
			store._handleSessionUpdate(agentThoughtChunk('thinking'));
			store._handleSessionUpdate(agentThoughtChunk('...'));

			const snap = store.snapshot;
			expect(snap.items).toHaveLength(1);
			expect(snap.items[0]).toMatchObject({
				kind: 'agent_thought',
				text: 'thinking...',
				streaming: true,
			});
		});

		it('flushes current when kind changes', () => {
			const store = new AgentStore('test');
			store._handleSessionUpdate(agentThoughtChunk('thinking'));
			store._handleSessionUpdate(agentMessageChunk('answer'));

			const snap = store.snapshot;
			// First item flushed (thought), second item still streaming (message)
			expect(snap.items).toHaveLength(2);
			expect(snap.items[0]).toMatchObject({
				kind: 'agent_thought',
				text: 'thinking',
				streaming: false,
			});
			expect(snap.items[1]).toMatchObject({
				kind: 'agent_message',
				text: 'answer',
				streaming: true,
			});
		});

		it('handles tool_call', () => {
			const store = new AgentStore('test');
			store._handleSessionUpdate(toolCallNotification('tc-1', 'Read file'));

			const snap = store.snapshot;
			expect(snap.items).toHaveLength(1);
			expect(snap.items[0]).toMatchObject({
				id: 'tc-1',
				kind: 'tool_call',
				toolTitle: 'Read file',
				toolStatus: 'in_progress',
			});
		});

		it('handles tool_call_update', () => {
			const store = new AgentStore('test');
			store._handleSessionUpdate(toolCallNotification('tc-1', 'Read file'));
			store._handleSessionUpdate(
				toolCallUpdateNotification('tc-1', 'completed'),
			);

			const snap = store.snapshot;
			expect(snap.items).toHaveLength(1);
			expect(snap.items[0]).toMatchObject({
				id: 'tc-1',
				kind: 'tool_call',
				toolTitle: 'Read file',
				toolStatus: 'completed',
			});
		});

		it('skips user_message_chunk', () => {
			const store = new AgentStore('test');
			store._handleSessionUpdate({
				sessionId: 'test-session',
				update: {
					sessionUpdate: 'user_message_chunk',
					content: { type: 'text', text: 'hi' },
				},
			} as SessionNotification);

			expect(store.snapshot.items).toEqual([]);
		});

		it('flushes current when tool_call arrives', () => {
			const store = new AgentStore('test');
			store._handleSessionUpdate(agentMessageChunk('partial'));
			store._handleSessionUpdate(toolCallNotification('tc-1', 'Search'));

			const snap = store.snapshot;
			expect(snap.items).toHaveLength(2);
			expect(snap.items[0]).toMatchObject({
				kind: 'agent_message',
				text: 'partial',
				streaming: false,
			});
			expect(snap.items[1]).toMatchObject({
				kind: 'tool_call',
				toolTitle: 'Search',
			});
		});
	});

	describe('prompt', () => {
		it('adds user message and sets status to running', async () => {
			const store = new AgentStore('test');
			initStore(store);

			const promise = store.prompt('hello');

			// Snapshot should include user message and running status
			const snap = store.snapshot;
			expect(snap.status).toBe('running');
			expect(snap.items).toHaveLength(1);
			expect(snap.items[0]).toMatchObject({
				kind: 'user_message',
				text: 'hello',
				streaming: false,
			});

			await promise;
			expect(store.snapshot.status).toBe('idle');
		});

		it('sets status to error on prompt failure', async () => {
			const store = new AgentStore('test');
			initStore(store, {
				prompt: vi.fn(async () => {
					throw new Error('prompt failed');
				}),
			});

			await store.prompt('hello');
			expect(store.snapshot.status).toBe('error');
		});
	});

	describe('permission bridge', () => {
		it('sets pendingPermission and resolves on resolvePermission', async () => {
			const store = new AgentStore('test');

			const request: RequestPermissionRequest = {
				sessionId: 'test-session',
				options: [
					{
						optionId: 'opt-allow',
						kind: 'allow_once',
						name: 'Allow',
					},
					{
						optionId: 'opt-reject',
						kind: 'reject_once',
						name: 'Reject',
					},
				],
				toolCall: {
					toolCallId: 'tc-1',
					title: 'Write file',
				},
			};

			const responsePromise = store._handleRequestPermission(request);

			// Should have pending permission
			expect(store.snapshot.pendingPermission).not.toBeNull();
			expect(store.snapshot.pendingPermission?.request.toolCall.title).toBe(
				'Write file',
			);

			// Resolve it
			store.resolvePermission('opt-allow');

			// Pending should be cleared
			expect(store.snapshot.pendingPermission).toBeNull();

			// Promise should resolve
			const response = await responsePromise;
			expect(response.outcome).toEqual({
				outcome: 'selected',
				optionId: 'opt-allow',
			});
		});
	});

	describe('subscribe', () => {
		it('calls listeners on state changes', () => {
			const store = new AgentStore('test');
			const listener = vi.fn();
			store.subscribe(listener);

			store._handleSessionUpdate(agentMessageChunk('hi'));
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('returns unsubscribe function', () => {
			const store = new AgentStore('test');
			const listener = vi.fn();
			const unsub = store.subscribe(listener);

			unsub();
			store._handleSessionUpdate(agentMessageChunk('hi'));
			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe('snapshot stability', () => {
		it('returns same reference when no changes', () => {
			const store = new AgentStore('test');
			const snap1 = store.snapshot;
			const snap2 = store.snapshot;
			expect(snap1).toBe(snap2);
		});

		it('returns new reference after emit', () => {
			const store = new AgentStore('test');
			const snap1 = store.snapshot;
			store._handleSessionUpdate(agentMessageChunk('hi'));
			const snap2 = store.snapshot;
			expect(snap1).not.toBe(snap2);
		});
	});

	describe('dispose', () => {
		it('sets status to disposed', async () => {
			const store = new AgentStore('test');
			const { stack } = initStore(store);

			await store.dispose();

			expect(store.snapshot.status).toBe('disposed');
			expect(stack.dispose).toHaveBeenCalled();
		});

		it('is idempotent', async () => {
			const store = new AgentStore('test');
			const { stack } = initStore(store);

			await store.dispose();
			await store.dispose();

			expect(stack.dispose).toHaveBeenCalledTimes(1);
		});
	});
});
