import { afterEach, describe, expect, it } from 'vitest';

import type { ManagedAgentEvent } from '../../../../messages/event.js';
import { CodexDirectTransport } from '../direct.js';
import type { CodexDirectClient, CodexDirectThread } from '../types.js';

// ---------------------------------------------------------------------------
// Mock SDK types (mirrors @openai/codex-sdk shapes)
// ---------------------------------------------------------------------------

type MockThreadEvent =
	| { type: 'thread.started'; thread_id: string }
	| { type: 'turn.started' }
	| { type: 'turn.completed'; usage: null }
	| { type: 'turn.failed'; error: { message: string } }
	| {
			type: 'item.started';
			item: { type: string; id: string; text: string };
	  }
	| {
			type: 'item.updated';
			item: { type: string; id: string; text: string };
	  }
	| {
			type: 'item.completed';
			item: { type: string; id: string; text: string };
	  }
	| { type: 'error'; message: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockThread(
	events: MockThreadEvent[],
	id: string | null = null,
): CodexDirectThread {
	return {
		id,
		runStreamed: async () => ({
			events: (async function* () {
				for (const event of events) {
					yield event;
				}
			})() as AsyncGenerator<MockThreadEvent>,
		}),
	} as CodexDirectThread;
}

function createMockClient(thread: CodexDirectThread): CodexDirectClient {
	return {
		startThread: () => thread,
		resumeThread: () => thread,
	};
}

function createTransport(thread: CodexDirectThread): {
	transport: CodexDirectTransport;
	events: ManagedAgentEvent[];
} {
	const events: ManagedAgentEvent[] = [];
	const client = createMockClient(thread);
	const transport = new CodexDirectTransport({
		kind: 'direct',
		codex: client,
	});
	transport.onEvent = (event) => events.push(event);
	return { transport, events };
}

function waitForEvent(
	events: ManagedAgentEvent[],
	type: string,
	count = 1,
	timeoutMs = 3000,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(
			() =>
				reject(
					new Error(
						`Timed out waiting for ${count} "${type}" events (got ${events.filter((e) => e.type === type).length})`,
					),
				),
			timeoutMs,
		);
		const check = () => {
			if (events.filter((e) => e.type === type).length >= count) {
				clearTimeout(timer);
				resolve();
			} else {
				setTimeout(check, 10);
			}
		};
		check();
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CodexDirectTransport', () => {
	let transport: CodexDirectTransport | null = null;

	afterEach(async () => {
		if (transport) {
			await transport.shutdown();
			transport = null;
		}
	});

	it('startSession emits agent.ready + session.started', async () => {
		const thread = createMockThread([]);
		const result = createTransport(thread);
		transport = result.transport;

		await transport.startSession();

		const types = result.events.map((e) => e.type);
		expect(types).toEqual(['agent.ready', 'session.started']);
	});

	it('startSession with threadId resumes', async () => {
		const thread = createMockThread([], 'resumed-thread');
		const result = createTransport(thread);
		transport = result.transport;

		await transport.startSession('existing-thread');

		expect(result.events.map((e) => e.type)).toContain('session.started');
		expect(transport.threadId).toBe('resumed-thread');
	});

	it('startTurn streams events from SDK', async () => {
		const thread = createMockThread([
			{ type: 'thread.started', thread_id: 'sdk-thread-1' },
			{ type: 'turn.started' },
			{
				type: 'item.started',
				item: { type: 'agent_message', id: 'msg-1', text: '' },
			},
			{
				type: 'item.updated',
				item: { type: 'agent_message', id: 'msg-1', text: 'Hello' },
			},
			{
				type: 'item.completed',
				item: { type: 'agent_message', id: 'msg-1', text: 'Hello world' },
			},
			{ type: 'turn.completed', usage: null },
		]);
		const result = createTransport(thread);
		transport = result.transport;

		await transport.startSession();

		await transport.startTurn([{ kind: 'user_message', text: 'hi' }]);
		await waitForEvent(result.events, 'turn.completed', 1);

		const types = result.events.map((e) => e.type);
		expect(types).toContain('turn.started');
		expect(types).toContain('item.started');
		expect(types).toContain('item.delta');
		expect(types).toContain('item.completed');
		expect(types).toContain('turn.completed');

		// Verify delta tracking
		const deltas = result.events.filter((e) => e.type === 'item.delta');
		expect(deltas.length).toBeGreaterThan(0);
	});

	it('startTurn throws if session not initialized', async () => {
		const thread = createMockThread([]);
		const result = createTransport(thread);
		transport = result.transport;

		await expect(
			transport.startTurn([{ kind: 'user_message', text: 'hi' }]),
		).rejects.toThrow('Session not initialized');
	});

	it('startTurn throws if turn already in progress', async () => {
		// Create a thread that never completes its turn (but responds to abort)
		const neverEndingThread: CodexDirectThread = {
			id: null,
			runStreamed: async (
				_input: unknown,
				options?: { signal?: AbortSignal },
			) => ({
				events: (async function* () {
					yield { type: 'turn.started' } as MockThreadEvent;
					await new Promise((_resolve, reject) => {
						options?.signal?.addEventListener('abort', () =>
							reject(new Error('aborted')),
						);
					});
				})() as AsyncGenerator<MockThreadEvent>,
			}),
		} as CodexDirectThread;

		const result = createTransport(neverEndingThread);
		transport = result.transport;

		await transport.startSession();
		await transport.startTurn([{ kind: 'user_message', text: 'first' }]);

		await expect(
			transport.startTurn([{ kind: 'user_message', text: 'second' }]),
		).rejects.toThrow('A turn is already in progress');
	});

	it('interruptTurn aborts the current turn', async () => {
		const neverEndingThread: CodexDirectThread = {
			id: null,
			runStreamed: async (
				_input: unknown,
				options?: { signal?: AbortSignal },
			) => ({
				events: (async function* () {
					yield { type: 'turn.started' } as MockThreadEvent;
					await new Promise((_resolve, reject) => {
						options?.signal?.addEventListener('abort', () =>
							reject(new Error('aborted')),
						);
					});
				})() as AsyncGenerator<MockThreadEvent>,
			}),
		} as CodexDirectThread;

		const result = createTransport(neverEndingThread);
		transport = result.transport;

		await transport.startSession();
		await transport.startTurn([{ kind: 'user_message', text: 'hi' }]);

		// Wait for turn.started
		await waitForEvent(result.events, 'turn.started', 1);

		await transport.interruptTurn();
		// The abort should not emit an error (signal was aborted intentionally)
	});

	it('interruptTurn throws if no active turn', async () => {
		const thread = createMockThread([]);
		const result = createTransport(thread);
		transport = result.transport;

		await transport.startSession();

		await expect(transport.interruptTurn()).rejects.toThrow(
			'No active turn to interrupt',
		);
	});

	it('forkSession throws (unsupported)', async () => {
		const thread = createMockThread([]);
		const result = createTransport(thread);
		transport = result.transport;

		await transport.startSession();

		await expect(transport.forkSession()).rejects.toThrow(
			'not supported by the Codex SDK transport',
		);
	});

	it('resolvePermission throws (unsupported)', async () => {
		const thread = createMockThread([]);
		const result = createTransport(thread);
		transport = result.transport;

		await transport.startSession();

		expect(() => transport!.resolvePermission('allow')).toThrow(
			'not supported by the Codex SDK transport',
		);
	});

	it('handles turn.failed events', async () => {
		const thread = createMockThread([
			{ type: 'turn.started' },
			{ type: 'turn.failed', error: { message: 'API rate limit' } },
		]);
		const result = createTransport(thread);
		transport = result.transport;

		await transport.startSession();
		await transport.startTurn([{ kind: 'user_message', text: 'hi' }]);
		await waitForEvent(result.events, 'error', 1);

		const errors = result.events.filter((e) => e.type === 'error');
		expect(errors).toHaveLength(1);
		expect(
			(errors[0] as { type: 'error'; error: { message: string } }).error
				.message,
		).toBe('API rate limit');
	});

	it('handles error events from SDK stream', async () => {
		const thread = createMockThread([
			{ type: 'error', message: 'Connection lost' },
		]);
		const result = createTransport(thread);
		transport = result.transport;

		await transport.startSession();
		await transport.startTurn([{ kind: 'user_message', text: 'hi' }]);
		await waitForEvent(result.events, 'error', 1);

		const errors = result.events.filter((e) => e.type === 'error');
		expect(errors.length).toBeGreaterThan(0);
	});

	it('handles error item events', async () => {
		const mockThread: CodexDirectThread = {
			id: null,
			runStreamed: async () => ({
				events: (async function* () {
					yield { type: 'turn.started' };
					yield {
						type: 'item.started',
						item: { type: 'error', id: 'err-1', message: 'Something broke' },
					};
					yield { type: 'turn.completed', usage: null };
				})() as AsyncGenerator<MockThreadEvent>,
			}),
		} as CodexDirectThread;

		const result = createTransport(mockThread);
		transport = result.transport;

		await transport.startSession();
		await transport.startTurn([{ kind: 'user_message', text: 'hi' }]);
		await waitForEvent(result.events, 'turn.completed', 1);

		const errors = result.events.filter((e) => e.type === 'error');
		expect(errors.length).toBeGreaterThan(0);
	});

	it('updates threadId from thread.started event', async () => {
		const thread = createMockThread([
			{ type: 'thread.started', thread_id: 'new-thread-id' },
			{ type: 'turn.started' },
			{ type: 'turn.completed', usage: null },
		]);
		const result = createTransport(thread);
		transport = result.transport;

		await transport.startSession();
		await transport.startTurn([{ kind: 'user_message', text: 'hi' }]);
		await waitForEvent(result.events, 'turn.completed', 1);

		expect(transport.threadId).toBe('new-thread-id');
	});

	it('shutdown cleans up state', async () => {
		const thread = createMockThread([]);
		const result = createTransport(thread);
		transport = result.transport;

		await transport.startSession();
		expect(transport.threadId).toBeNull(); // mock thread has null id

		await transport.shutdown();

		// After shutdown, startTurn should fail
		await expect(
			transport.startTurn([{ kind: 'user_message', text: 'hi' }]),
		).rejects.toThrow('Session not initialized');

		transport = null; // prevent double shutdown
	});
});
