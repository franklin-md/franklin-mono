import { describe, expect, it, vi } from 'vitest';

import type {
	ManagedAgentAdapter,
	ManagedAgentCommand,
	ManagedAgentCommandResult,
	ManagedAgentEvent,
} from '@franklin/managed-agent';

import { AgentHandle } from '../agent-handle.js';
import { InMemoryAgentStore } from '../store.js';
import type { AgentMetadata } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockAdapter(
	overrides?: Partial<ManagedAgentAdapter>,
): ManagedAgentAdapter {
	return {
		dispatch: vi.fn(async () => ({ ok: true }) as ManagedAgentCommandResult),
		dispose: vi.fn(async () => {}),
		...overrides,
	};
}

function createMetadata(overrides?: Partial<AgentMetadata>): AgentMetadata {
	return {
		agentId: 'test-agent',
		adapterKind: 'mock',
		status: 'created',
		createdAt: 1000,
		updatedAt: 1000,
		sessionRef: {},
		sessionSpec: {},
		...overrides,
	};
}

function createHandle(opts?: {
	adapter?: ManagedAgentAdapter;
	store?: InMemoryAgentStore;
	metadata?: AgentMetadata;
	onRemove?: (id: string) => void;
}) {
	const adapter = opts?.adapter ?? createMockAdapter();
	const store = opts?.store ?? new InMemoryAgentStore();
	const metadata = opts?.metadata ?? createMetadata();
	const onRemove = opts?.onRemove ?? vi.fn();
	const handle = new AgentHandle(
		metadata.agentId,
		adapter,
		store,
		metadata,
		onRemove,
	);
	return { handle, adapter, store, onRemove };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgentHandle', () => {
	// -----------------------------------------------------------------------
	// Dispatch
	// -----------------------------------------------------------------------

	describe('dispatch', () => {
		it('delegates to adapter and returns result', async () => {
			const { handle, adapter } = createHandle();
			const cmd: ManagedAgentCommand = {
				type: 'session.start',
				spec: {},
			};
			const result = await handle.dispatch(cmd);
			expect(result).toEqual({ ok: true });
			expect(adapter.dispatch).toHaveBeenCalledWith(cmd);
		});

		it('does not record commands in events', async () => {
			const { handle, store } = createHandle();
			await handle.dispatch({ type: 'session.start', spec: {} });

			const events = await store.loadEvents('test-agent');
			expect(events).toHaveLength(0);
		});

		it('returns error result when disposed', async () => {
			const { handle } = createHandle();
			await handle.dispose();

			const result = await handle.dispatch({
				type: 'session.start',
				spec: {},
			});
			expect(result).toEqual({
				ok: false,
				error: { code: 'DISPOSED', message: 'Agent handle is disposed' },
			});
		});
	});

	// -----------------------------------------------------------------------
	// Event listener fan-out
	// -----------------------------------------------------------------------

	describe('on / unsubscribe', () => {
		it('fans out events to all listeners', () => {
			const { handle } = createHandle();
			const events1: ManagedAgentEvent[] = [];
			const events2: ManagedAgentEvent[] = [];

			handle.on((e) => events1.push(e));
			handle.on((e) => events2.push(e));

			handle._handleEvent({ type: 'turn.completed' });

			expect(events1).toHaveLength(1);
			expect(events2).toHaveLength(1);
			expect(events1[0]!.type).toBe('turn.completed');
		});

		it('unsubscribe removes a specific listener', () => {
			const { handle } = createHandle();
			const events: ManagedAgentEvent[] = [];

			const unsub = handle.on((e) => events.push(e));
			handle._handleEvent({ type: 'turn.completed' });
			expect(events).toHaveLength(1);

			unsub();
			handle._handleEvent({ type: 'agent.exited' });
			expect(events).toHaveLength(1); // no new event
		});

		it('delivers raw events including deltas', () => {
			const { handle } = createHandle();
			const events: ManagedAgentEvent[] = [];
			handle.on((e) => events.push(e));

			handle._handleEvent({
				type: 'item.started',
				item: { kind: 'assistant_message' },
			});
			handle._handleEvent({
				type: 'item.delta',
				item: { kind: 'assistant_message', textDelta: 'hi' },
			});

			expect(events).toHaveLength(2);
			expect(events[1]!.type).toBe('item.delta');
		});
	});

	// -----------------------------------------------------------------------
	// Status tracking
	// -----------------------------------------------------------------------

	describe('status', () => {
		it('starts at created', () => {
			const { handle } = createHandle();
			expect(handle.status).toBe('created');
		});

		it('transitions to ready on successful session.start dispatch', async () => {
			const { handle } = createHandle();
			await handle.dispatch({ type: 'session.start', spec: {} });
			expect(handle.status).toBe('ready');
		});

		it('transitions to ready on successful session.resume dispatch', async () => {
			const { handle } = createHandle();
			await handle.dispatch({ type: 'session.resume', ref: {} });
			expect(handle.status).toBe('ready');
		});

		it('transitions to ready on successful session.fork dispatch', async () => {
			const { handle } = createHandle();
			await handle.dispatch({ type: 'session.fork', ref: {} });
			expect(handle.status).toBe('ready');
		});

		it('transitions to running on successful turn.start dispatch', async () => {
			const { handle } = createHandle();
			await handle.dispatch({
				type: 'turn.start',
				input: [{ kind: 'user_message', text: 'hi' }],
			});
			expect(handle.status).toBe('running');
		});

		it('does not transition status on failed dispatch', async () => {
			const adapter = createMockAdapter({
				dispatch: vi.fn(async () => ({
					ok: false as const,
					error: { code: 'ERR', message: 'fail' },
				})),
			});
			const { handle } = createHandle({ adapter });
			await handle.dispatch({ type: 'session.start', spec: {} });
			expect(handle.status).toBe('created');
		});

		it('transitions to idle on turn.completed event', () => {
			const { handle } = createHandle();
			handle._handleEvent({ type: 'turn.completed' });
			expect(handle.status).toBe('idle');
		});

		it('transitions to error on error event', () => {
			const { handle } = createHandle();
			handle._handleEvent({
				type: 'error',
				error: { code: 'E', message: 'fail' },
			});
			expect(handle.status).toBe('error');
		});

		it('transitions to exited on agent.exited', () => {
			const { handle } = createHandle();
			handle._handleEvent({ type: 'agent.exited' });
			expect(handle.status).toBe('exited');
		});
	});

	// -----------------------------------------------------------------------
	// Events (raw event storage)
	// -----------------------------------------------------------------------

	describe('events', () => {
		it('stores all raw events including deltas', async () => {
			const { handle } = createHandle();

			handle._handleEvent({
				type: 'item.started',
				item: { kind: 'assistant_message' },
			});
			handle._handleEvent({
				type: 'item.delta',
				item: { kind: 'assistant_message', textDelta: 'hi' },
			});
			handle._handleEvent({
				type: 'item.completed',
				item: { kind: 'assistant_message', text: 'hi' },
			});
			handle._handleEvent({ type: 'turn.completed' });

			// Wait for fire-and-forget store operations
			await new Promise((r) => setTimeout(r, 10));

			const events = await handle.events();
			const types = events.map((e) => e.type);

			expect(types).toEqual([
				'item.started',
				'item.delta',
				'item.completed',
				'turn.completed',
			]);
		});

		it('preserves event payloads', async () => {
			const { handle } = createHandle();

			handle._handleEvent({
				type: 'permission.requested',
				payload: { kind: 'generic', message: 'approve?' },
			});

			await new Promise((r) => setTimeout(r, 10));

			const events = await handle.events();
			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				type: 'permission.requested',
				payload: { kind: 'generic', message: 'approve?' },
			});
		});
	});

	// -----------------------------------------------------------------------
	// Dispose lifecycle
	// -----------------------------------------------------------------------

	describe('dispose', () => {
		it('sets status to disposed', async () => {
			const { handle } = createHandle();
			await handle.dispose();
			expect(handle.status).toBe('disposed');
		});

		it('calls adapter.dispose()', async () => {
			const { handle, adapter } = createHandle();
			await handle.dispose();
			expect(adapter.dispose).toHaveBeenCalled();
		});

		it('calls onRemoveFromManager callback', async () => {
			const onRemove = vi.fn();
			const { handle } = createHandle({ onRemove });
			await handle.dispose();
			expect(onRemove).toHaveBeenCalledWith('test-agent');
		});

		it('clears all listeners', async () => {
			const { handle } = createHandle();
			const events: ManagedAgentEvent[] = [];
			handle.on((e) => events.push(e));

			await handle.dispose();

			// Events after dispose should not reach listener
			handle._handleEvent({ type: 'turn.completed' });
			expect(events).toHaveLength(0);
		});

		it('does not store events in event log on dispose', async () => {
			const { handle, store } = createHandle();
			await handle.dispose();

			await new Promise((r) => setTimeout(r, 10));

			const events = await store.loadEvents('test-agent');
			// Dispose does not write events to the event log
			expect(events).toHaveLength(0);
		});

		it('is idempotent', async () => {
			const { handle, adapter } = createHandle();
			await handle.dispose();
			await handle.dispose(); // should not throw

			expect(adapter.dispose).toHaveBeenCalledTimes(1);
		});
	});
});
