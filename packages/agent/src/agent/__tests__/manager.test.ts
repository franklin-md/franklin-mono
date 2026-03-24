import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDuplexPair } from '@franklin/transport';
import {
	createAgentConnection,
	type MiniACPClient,
	type ClientProtocol,
	type AgentProtocol,
} from '@franklin/mini-acp';
import type { Extension, CoreAPI, StoreAPI } from '@franklin/extensions';
import { AgentManager } from '../manager/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a duplex pair with a mock agent on one end.
 * Returns the client-side transport for AgentManager.
 */
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
			yield { type: 'turnEnd' as const, stopReason: 'end_turn' };
		},
		async cancel() {
			return { type: 'turnEnd' as const, stopReason: 'cancelled' };
		},
	};

	createAgentConnection(agentTransport, handlers);
	return clientTransport;
}

// ---------------------------------------------------------------------------
// Test extensions
// ---------------------------------------------------------------------------

function itemsExtension(): Extension<CoreAPI & StoreAPI> {
	return (api) => {
		api.registerStore<{ id: string; text: string }[]>('items', [], 'private');
	};
}

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
// AgentManager
// ---------------------------------------------------------------------------

describe('AgentManager', () => {
	const disposables: { dispose: () => Promise<void> }[] = [];

	afterEach(async () => {
		for (const d of disposables) {
			await d.dispose().catch(() => {});
		}
		disposables.length = 0;
	});

	function track<T extends { dispose: () => Promise<void> }>(v: T): T {
		disposables.push(v);
		return v;
	}

	it('spawn() creates an agent with extension stores', async () => {
		const manager = new AgentManager(() => [itemsExtension()]);

		const { agent } = await manager.spawn(createTestTransport());
		track(agent);

		const items = agent.stores.stores.get('items');
		expect(items).toBeDefined();
		expect(items!.store.get()).toEqual([]);
	});

	it('spawn() returns agentId alongside the agent', async () => {
		const manager = new AgentManager(() => [itemsExtension()]);

		const { agentId, agent } = await manager.spawn(createTestTransport());
		track(agent);

		expect(typeof agentId).toBe('string');
		expect(agentId.length).toBeGreaterThan(0);
	});

	it('spawn() calls factory each time to get fresh extensions', async () => {
		const factory = vi.fn(() => [counterExtension()]);
		const manager = new AgentManager(factory);

		const { agent: a1 } = await manager.spawn(createTestTransport());
		const { agent: a2 } = await manager.spawn(createTestTransport());
		track(a1);
		track(a2);

		expect(factory).toHaveBeenCalledTimes(2);

		// Independent stores
		const s1 = a1.stores.stores.get('counter')!.store;
		const s2 = a2.stores.stores.get('counter')!.store;
		s1.set(() => 42);
		expect(s2.get()).toBe(0);
	});

	it('get() retrieves agent by ID', async () => {
		const manager = new AgentManager(() => [itemsExtension()]);

		const { agentId, agent } = await manager.spawn(createTestTransport());
		track(agent);

		const retrieved = manager.get(agentId);
		expect(retrieved).toBe(agent);
	});

	it('get() throws for unknown agent ID', () => {
		const manager = new AgentManager(() => [itemsExtension()]);

		expect(() => manager.get('nonexistent')).toThrow(
			'Agent nonexistent not found',
		);
	});

	it('child() creates agent with copied private stores', async () => {
		const manager = new AgentManager(() => [counterExtension()]);

		const { agentId: parentId, agent: parent } = await manager.spawn(
			createTestTransport(),
		);
		track(parent);

		const parentStore = parent.stores.stores.get('counter')!.store;
		parentStore.set(() => 10);

		const { agent: child } = await manager.child(
			parentId,
			createTestTransport(),
		);
		track(child);

		const childStore = child.stores.stores.get('counter')!.store;

		// Child starts with a snapshot of parent's state
		expect(childStore.get()).toBe(10);

		// But mutations are independent (private store → independent copy)
		childStore.set(() => 99);
		expect(parentStore.get()).toBe(10);
		expect(childStore.get()).toBe(99);
	});

	it('child() shares global stores across parent/child', async () => {
		const manager = new AgentManager(() => [sharedCounterExtension()]);

		const { agentId: parentId, agent: parent } = await manager.spawn(
			createTestTransport(),
		);
		track(parent);

		const { agent: child } = await manager.child(
			parentId,
			createTestTransport(),
		);
		track(child);

		const parentStore = parent.stores.stores.get('counter')!.store;
		const childStore = child.stores.stores.get('counter')!.store;

		// Global stores are shared — same instance
		parentStore.set(() => 42);
		expect(childStore.get()).toBe(42);

		childStore.set(() => 100);
		expect(parentStore.get()).toBe(100);
	});

	it('multiple spawn() calls produce independent agents', async () => {
		const manager = new AgentManager(() => [
			itemsExtension(),
			counterExtension(),
		]);

		const { agent: a1 } = await manager.spawn(createTestTransport());
		const { agent: a2 } = await manager.spawn(createTestTransport());
		const { agent: a3 } = await manager.spawn(createTestTransport());
		track(a1);
		track(a2);
		track(a3);

		const items1 = a1.stores.stores.get('items')!.store;
		const items2 = a2.stores.stores.get('items')!.store;
		const items3 = a3.stores.stores.get('items')!.store;

		items1.set((draft: unknown) => {
			(draft as { id: string; text: string }[]).push({
				id: '1',
				text: 'a1-item',
			});
		});

		const counter2 = a2.stores.stores.get('counter')!.store;
		counter2.set(() => 5);

		expect(items1.get()).toHaveLength(1);
		expect(items2.get()).toHaveLength(0);
		expect(items3.get()).toHaveLength(0);

		const counter1 = a1.stores.stores.get('counter')!.store;
		const counter3 = a3.stores.stores.get('counter')!.store;
		expect(counter1.get()).toBe(0);
		expect(counter2.get()).toBe(5);
		expect(counter3.get()).toBe(0);
	});
});
