import { afterEach, describe, expect, it } from 'vitest';

import type { CodexAdapter, CodexAdapterOptions } from '../codex-adapter.js';
import {
	createCodexAdapterHarness,
	createScriptedCodexAdapterHarness,
	getProcessTransport,
} from './test-harness.js';

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
// Tests
// ---------------------------------------------------------------------------

describe('CodexAdapter', () => {
	let adapter: CodexAdapter | null = null;

	function createHarness(overrides?: Partial<CodexAdapterOptions>) {
		const harness = createScriptedCodexAdapterHarness(
			MOCK_SERVER_SCRIPT,
			overrides,
		);
		adapter = harness.adapter;
		return harness;
	}

	afterEach(async () => {
		if (adapter) {
			await adapter.dispose();
			adapter = null;
		}
	});

	it('session.start initializes successfully', async () => {
		const harness = createHarness();

		await harness.startSession();
	});

	it('turn.start dispatches and streams item events', async () => {
		const harness = createHarness();

		await harness.startSession();
		await harness.startTurn('hi');

		await harness.waitForEvent('turn.completed', 1);

		const types = harness.events.map((event) => event.type);
		expect(types).toContain('item.started');
		expect(types).toContain('item.delta');
		expect(types).toContain('item.completed');
		expect(types).toContain('turn.completed');
	});

	it('turn.start fails if session not initialized', async () => {
		const harness = createHarness();

		const result = await harness.dispatch({
			type: 'turn.start',
			input: [{ kind: 'user_message', text: 'hi' }],
		});
		expect(result).toEqual({
			ok: false,
			error: { code: 'DISPATCH_ERROR', message: 'Session not initialized' },
		});
	});

	it('turn.interrupt fails if no active turn', async () => {
		const harness = createHarness();

		await harness.startSession();

		const result = await harness.dispatch({ type: 'turn.interrupt' });
		expect(result).toEqual({
			ok: false,
			error: {
				code: 'DISPATCH_ERROR',
				message: 'No active turn to interrupt',
			},
		});
	});

	it('session.resume requires a threadId', async () => {
		const harness = createHarness();

		const result = await harness.dispatch({
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
		const harness = createHarness({ threadId: 'existing-thread' });

		await harness.resumeSession();
	});

	it('session.fork updates threadId', async () => {
		const harness = createHarness();

		await harness.startSession();

		const result = await harness.dispatch({
			type: 'session.fork',
			ref: {},
		});
		expect(result).toEqual({ ok: true });
	});

	it('session.fork fails without active session', async () => {
		const harness = createHarness();

		const result = await harness.dispatch({
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
		const harness = createHarness();

		await harness.startSession();

		const result = await harness.dispatch({
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
		const harness = createHarness();

		await harness.startSession();

		await harness.dispose();
		adapter = null; // prevent double dispose in afterEach

		// After dispose, dispatch should fail
		// (we'd need a new adapter instance)
	});

	it('emits agent.exited when process exits', async () => {
		const harness = createCodexAdapterHarness({
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
							process.stdout.write(JSON.stringify({ jsonrpc: '2.0', method: 'thread/started', params: { thread: { id: 't1' } } }) + '\\n');
							setTimeout(() => process.exit(0), 50);
						}
					});
					`,
				],
			},
		});
		adapter = harness.adapter;

		await harness.startSession();
		await harness.waitForEvent('agent.exited', 1);

		expect(harness.events.map((event) => event.type)).toContain('agent.exited');
	});

	it('handles permission flow: request → resolve', async () => {
		const harness = createHarness();

		await harness.startSession();

		// Trigger a command approval via the internal RPC test hook
		const processTransport = getProcessTransport(harness.adapter);
		await processTransport._rpc!.request('test/send-approval', {});

		await harness.waitForEvent('permission.requested', 1);

		const permEvent = harness.events.find(
			(event) => event.type === 'permission.requested',
		);
		expect(permEvent).toBeDefined();

		// Resolve it
		const result = await harness.dispatch({
			type: 'permission.resolve',
			decision: 'allow',
		});
		expect(result).toEqual({ ok: true });

		const resolved = harness.events.find(
			(event) => event.type === 'permission.resolved',
		);
		expect(resolved).toBeDefined();
	});
});
