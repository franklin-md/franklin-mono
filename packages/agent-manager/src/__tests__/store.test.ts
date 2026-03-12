import { describe, expect, it } from 'vitest';

import type { ManagedAgentEvent } from '@franklin/managed-agent';

import { InMemoryAgentStore } from '../store.js';
import type { AgentMetadata } from '../types.js';

function createMetadata(
	agentId: string,
	overrides?: Partial<AgentMetadata>,
): AgentMetadata {
	return {
		agentId,
		adapterKind: 'mock',
		status: 'created',
		createdAt: 1000,
		updatedAt: 1000,
		sessionRef: {},
		sessionSpec: {},
		...overrides,
	};
}

describe('InMemoryAgentStore', () => {
	// -----------------------------------------------------------------------
	// Metadata
	// -----------------------------------------------------------------------

	describe('metadata', () => {
		it('saves and loads metadata', async () => {
			const store = new InMemoryAgentStore();
			const meta = createMetadata('a1');
			await store.saveMetadata(meta);

			const loaded = await store.loadMetadata('a1');
			expect(loaded).toEqual(meta);
		});

		it('returns undefined for unknown agentId', async () => {
			const store = new InMemoryAgentStore();
			expect(await store.loadMetadata('nope')).toBeUndefined();
		});

		it('overwrites metadata on save', async () => {
			const store = new InMemoryAgentStore();
			await store.saveMetadata(createMetadata('a1', { status: 'created' }));
			await store.saveMetadata(createMetadata('a1', { status: 'ready' }));

			const loaded = await store.loadMetadata('a1');
			expect(loaded?.status).toBe('ready');
		});

		it('lists all metadata', async () => {
			const store = new InMemoryAgentStore();
			await store.saveMetadata(createMetadata('a1'));
			await store.saveMetadata(createMetadata('a2'));

			const list = await store.listMetadata();
			expect(list).toHaveLength(2);
			expect(list.map((m) => m.agentId).sort()).toEqual(['a1', 'a2']);
		});
	});

	// -----------------------------------------------------------------------
	// Events
	// -----------------------------------------------------------------------

	describe('events', () => {
		it('appends and loads events', async () => {
			const store = new InMemoryAgentStore();
			const event: ManagedAgentEvent = { type: 'agent.ready' };
			await store.appendEvent('a1', event);

			const events = await store.loadEvents('a1');
			expect(events).toEqual([event]);
		});

		it('returns empty array for unknown agentId', async () => {
			const store = new InMemoryAgentStore();
			expect(await store.loadEvents('nope')).toEqual([]);
		});

		it('preserves event order', async () => {
			const store = new InMemoryAgentStore();
			const events: ManagedAgentEvent[] = [
				{ type: 'agent.ready' },
				{ type: 'session.started' },
				{ type: 'turn.started' },
			];
			for (const e of events) {
				await store.appendEvent('a1', e);
			}

			const loaded = await store.loadEvents('a1');
			expect(loaded.map((e) => e.type)).toEqual([
				'agent.ready',
				'session.started',
				'turn.started',
			]);
		});

		it('stores all event types including deltas', async () => {
			const store = new InMemoryAgentStore();
			const events: ManagedAgentEvent[] = [
				{
					type: 'item.started',
					item: { kind: 'assistant_message' },
				},
				{
					type: 'item.delta',
					item: { kind: 'assistant_message', textDelta: 'hi' },
				},
				{
					type: 'item.completed',
					item: { kind: 'assistant_message', text: 'hi' },
				},
			];
			for (const e of events) {
				await store.appendEvent('a1', e);
			}

			const loaded = await store.loadEvents('a1');
			expect(loaded).toHaveLength(3);
			expect(loaded[1]?.type).toBe('item.delta');
		});

		it('returns a copy, not a reference', async () => {
			const store = new InMemoryAgentStore();
			await store.appendEvent('a1', { type: 'agent.ready' });

			const events1 = await store.loadEvents('a1');
			const events2 = await store.loadEvents('a1');
			expect(events1).not.toBe(events2);
			expect(events1).toEqual(events2);
		});

		it('isolates events between agents', async () => {
			const store = new InMemoryAgentStore();
			await store.appendEvent('a1', { type: 'agent.ready' });
			await store.appendEvent('a2', { type: 'turn.started' });

			const e1 = await store.loadEvents('a1');
			const e2 = await store.loadEvents('a2');
			expect(e1).toHaveLength(1);
			expect(e1[0]?.type).toBe('agent.ready');
			expect(e2).toHaveLength(1);
			expect(e2[0]?.type).toBe('turn.started');
		});
	});

	// -----------------------------------------------------------------------
	// Remove
	// -----------------------------------------------------------------------

	describe('remove', () => {
		it('removes both metadata and events', async () => {
			const store = new InMemoryAgentStore();
			await store.saveMetadata(createMetadata('a1'));
			await store.appendEvent('a1', { type: 'agent.ready' });

			await store.remove('a1');

			expect(await store.loadMetadata('a1')).toBeUndefined();
			expect(await store.loadEvents('a1')).toEqual([]);
		});

		it('does not throw for unknown agentId', async () => {
			const store = new InMemoryAgentStore();
			await expect(store.remove('nope')).resolves.toBeUndefined();
		});
	});
});
