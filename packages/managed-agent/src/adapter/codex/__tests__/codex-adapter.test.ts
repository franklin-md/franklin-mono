import { afterEach, describe, expect, it } from 'vitest';

import type { ManagedAgentEvent } from '../../../messages/event.js';
import { CodexAdapter, type CodexAdapterOptions } from '../codex-adapter.js';
import type { CodexProcessTransport } from '../transport/process.js';

// ---------------------------------------------------------------------------
// Mock Codex app-server script.
//
// Handles: initialize, thread/start, thread/resume, thread/fork,
//          turn/start, turn/interrupt.
// Sends notifications for thread/started, turn/started, turn/completed,
// and server requests for command/approve.
// ---------------------------------------------------------------------------

const MOCK_SERVER_SCRIPT = `
const rl = require('readline').createInterface({ input: process.stdin });
let initialized = false;
let threadCounter = 0;
let turnCounter = 0;

rl.on('line', (line) => {
	const msg = JSON.parse(line);

	// Response to a server request (e.g. approval resolution)
	if (msg.id && msg.result && !msg.method) {
		return;
	}

	switch (msg.method) {
		case 'initialize': {
			initialized = true;
			respond(msg.id, { ok: true });
			break;
		}
		case 'thread/start': {
			threadCounter++;
			const threadId = 'thread-' + threadCounter;
			respond(msg.id, { threadId });
			notify('thread/started', { thread: { id: threadId } });
			break;
		}
		case 'thread/resume': {
			respond(msg.id, { ok: true });
			notify('thread/started', { thread: { id: msg.params.threadId } });
			break;
		}
		case 'thread/fork': {
			threadCounter++;
			const forkId = 'fork-' + threadCounter;
			respond(msg.id, { threadId: forkId });
			notify('thread/started', { thread: { id: forkId } });
			break;
		}
		case 'turn/start': {
			turnCounter++;
			const turnId = 'turn-' + turnCounter;
			respond(msg.id, { ok: true });
			notify('turn/started', { turn: { id: turnId } });

			// Simulate some output
			notify('item/started', { item: { type: 'agentMessage', id: 'msg-1', text: '' } });
			notify('item/agentMessage/delta', { item: { id: 'msg-1' }, delta: { text: 'Hello' } });
			notify('item/completed', { item: { type: 'agentMessage', id: 'msg-1', text: 'Hello' } });
			notify('turn/completed', { turn: { id: turnId } });
			break;
		}
		case 'turn/interrupt': {
			respond(msg.id, { ok: true });
			break;
		}
		case 'test/send-approval': {
			// Special test-only method: sends a command/approve server request
			respond(msg.id, { ok: true });
			serverRequest(200, 'command/approve', {
				item: { id: 'i1' },
				command: { command: 'rm -rf /' }
			});
			break;
		}
		default: {
			respond(msg.id, null);
		}
	}
});

function respond(id, result) {
	process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\\n');
}

function notify(method, params) {
	process.stdout.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\\n');
}

function serverRequest(id, method, params) {
	process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\\n');
}
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createAdapter(
	events: ManagedAgentEvent[],
	overrides?: Partial<CodexAdapterOptions>,
): CodexAdapter {
	return new CodexAdapter({
		onEvent: (event) => events.push(event),
		transport: { command: 'node', args: ['-e', MOCK_SERVER_SCRIPT] },
		...overrides,
	});
}

/** Wait until we've collected `count` events of a given type. */
function waitForEvents(
	events: ManagedAgentEvent[],
	type: string,
	count: number,
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

describe('CodexAdapter', () => {
	let adapter: CodexAdapter | null = null;

	afterEach(async () => {
		if (adapter) {
			await adapter.dispose();
			adapter = null;
		}
	});

	it('session.start initializes and emits agent.ready + session.started', async () => {
		const events: ManagedAgentEvent[] = [];
		adapter = createAdapter(events);

		const result = await adapter.dispatch({ type: 'session.start', spec: {} });
		expect(result).toEqual({ ok: true });

		// Wait for notifications to arrive
		await waitForEvents(events, 'session.started', 1);

		const types = events.map((e) => e.type);
		expect(types).toContain('agent.ready');
		expect(types).toContain('session.started');
	});

	it('turn.start dispatches and streams item events', async () => {
		const events: ManagedAgentEvent[] = [];
		adapter = createAdapter(events);

		await adapter.dispatch({ type: 'session.start', spec: {} });
		await waitForEvents(events, 'session.started', 1);

		const result = await adapter.dispatch({
			type: 'turn.start',
			input: [{ kind: 'user_message', text: 'hi' }],
		});
		expect(result).toEqual({ ok: true });

		// Wait for turn.completed
		await waitForEvents(events, 'turn.completed', 1);

		const types = events.map((e) => e.type);
		expect(types).toContain('turn.started');
		expect(types).toContain('item.started');
		expect(types).toContain('item.delta');
		expect(types).toContain('item.completed');
		expect(types).toContain('turn.completed');
	});

	it('turn.start fails if session not initialized', async () => {
		const events: ManagedAgentEvent[] = [];
		adapter = createAdapter(events);

		const result = await adapter.dispatch({
			type: 'turn.start',
			input: [{ kind: 'user_message', text: 'hi' }],
		});
		expect(result).toEqual({
			ok: false,
			error: { code: 'DISPATCH_ERROR', message: 'Session not initialized' },
		});
	});

	it('turn.interrupt fails if no active turn', async () => {
		const events: ManagedAgentEvent[] = [];
		adapter = createAdapter(events);

		await adapter.dispatch({ type: 'session.start', spec: {} });
		await waitForEvents(events, 'session.started', 1);

		const result = await adapter.dispatch({ type: 'turn.interrupt' });
		expect(result).toEqual({
			ok: false,
			error: {
				code: 'DISPATCH_ERROR',
				message: 'No active turn to interrupt',
			},
		});
	});

	it('session.resume requires a threadId', async () => {
		const events: ManagedAgentEvent[] = [];
		adapter = createAdapter(events);

		const result = await adapter.dispatch({
			type: 'session.resume',
			ref: {},
		});
		expect(result).toEqual({
			ok: false,
			error: {
				code: 'NO_THREAD_ID',
				message: 'Cannot resume without a threadId',
			},
		});
	});

	it('session.resume works when threadId is provided', async () => {
		const events: ManagedAgentEvent[] = [];
		adapter = createAdapter(events, { threadId: 'existing-thread' });

		const result = await adapter.dispatch({
			type: 'session.resume',
			ref: {},
		});
		expect(result).toEqual({ ok: true });

		await waitForEvents(events, 'session.started', 1);
		expect(events.map((e) => e.type)).toContain('agent.ready');
	});

	it('session.fork updates threadId', async () => {
		const events: ManagedAgentEvent[] = [];
		adapter = createAdapter(events);

		await adapter.dispatch({ type: 'session.start', spec: {} });
		await waitForEvents(events, 'session.started', 1);

		const result = await adapter.dispatch({
			type: 'session.fork',
			ref: {},
		});
		expect(result).toEqual({ ok: true });

		// Should emit session.forked
		await waitForEvents(events, 'session.forked', 1);
	});

	it('session.fork fails without active session', async () => {
		const events: ManagedAgentEvent[] = [];
		adapter = createAdapter(events);

		const result = await adapter.dispatch({
			type: 'session.fork',
			ref: {},
		});
		expect(result).toEqual({
			ok: false,
			error: {
				code: 'NO_THREAD_ID',
				message: 'Cannot fork without a threadId',
			},
		});
	});

	it('permission.resolve fails without pending approval', async () => {
		const events: ManagedAgentEvent[] = [];
		adapter = createAdapter(events);

		await adapter.dispatch({ type: 'session.start', spec: {} });
		await waitForEvents(events, 'session.started', 1);

		const result = await adapter.dispatch({
			type: 'permission.resolve',
			decision: 'allow',
		});
		expect(result).toEqual({
			ok: false,
			error: {
				code: 'DISPATCH_ERROR',
				message: 'No pending approval to resolve',
			},
		});
	});

	it('dispose shuts down transport', async () => {
		const events: ManagedAgentEvent[] = [];
		adapter = createAdapter(events);

		await adapter.dispatch({ type: 'session.start', spec: {} });
		await waitForEvents(events, 'session.started', 1);

		await adapter.dispose();
		adapter = null; // prevent double dispose in afterEach

		// After dispose, dispatch should fail
		// (we'd need a new adapter instance)
	});

	it('emits agent.exited when process exits', async () => {
		const events: ManagedAgentEvent[] = [];
		// Use a script that exits shortly after handling both initialize and thread/start
		adapter = new CodexAdapter({
			onEvent: (event) => events.push(event),
			transport: {
				command: 'node',
				args: [
					'-e',
					`
					const rl = require('readline').createInterface({ input: process.stdin });
					rl.on('line', (line) => {
						const msg = JSON.parse(line);
						process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { threadId: 't1' } }) + '\\n');
						if (msg.method === 'thread/start') {
							setTimeout(() => process.exit(0), 50);
						}
					});
					`,
				],
			},
		});

		await adapter.dispatch({ type: 'session.start', spec: {} });
		await waitForEvents(events, 'agent.exited', 1);

		expect(events.map((e) => e.type)).toContain('agent.exited');
	});

	it('handles permission flow: request → resolve', async () => {
		const events: ManagedAgentEvent[] = [];
		adapter = createAdapter(events);

		await adapter.dispatch({ type: 'session.start', spec: {} });
		await waitForEvents(events, 'session.started', 1);

		// Trigger a command approval via the internal RPC test hook
		const processTransport = (
			adapter as unknown as { transport: CodexProcessTransport }
		).transport;
		await processTransport._rpc!.sendRequest('test/send-approval', {});

		await waitForEvents(events, 'permission.requested', 1);

		const permEvent = events.find((e) => e.type === 'permission.requested');
		expect(permEvent).toBeDefined();

		// Resolve it
		const result = await adapter.dispatch({
			type: 'permission.resolve',
			decision: 'allow',
		});
		expect(result).toEqual({ ok: true });

		// Should emit permission.resolved
		const resolved = events.find((e) => e.type === 'permission.resolved');
		expect(resolved).toBeDefined();
	});
});
