import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AnyMessage } from '@agentclientprotocol/sdk';

import type { McpToolStream } from '@franklin/local-mcp';

import { createStore, createSharedStore } from '../../store/index.js';
import type { Store } from '../../store/index.js';
import type { Extension, ExtensionAPI } from '../../extensions/types/index.js';
import type { McpTransportFactory } from '../../extensions/compile/start.js';
import type { AgentTransport } from '../../transport/index.js';
import { AgentManager } from '../manager/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockTransport(): AgentTransport {
	const readable = new ReadableStream<AnyMessage>({
		pull() {
			return new Promise<void>(() => {});
		},
		cancel() {},
	});

	const writable = new WritableStream<AnyMessage>({
		write() {},
		close() {},
		abort() {},
	});

	return { readable, writable, close: vi.fn(async () => {}) };
}

function createMockToolTransport(): McpTransportFactory {
	return async (_name) => {
		const mockStream = {
			readable: new ReadableStream<never>(),
			writable: new WritableStream<never>(),
			close: async () => {},
		} as unknown as McpToolStream;

		return {
			config: {
				name: 'test-relay',
				command: 'node',
				args: ['--version'],
				env: [{ name: 'STUB', value: 'true' }],
			},
			stream: mockStream,
			dispose: vi.fn(async () => {}),
		};
	};
}

// ---------------------------------------------------------------------------
// Test extensions
// ---------------------------------------------------------------------------

interface Item {
	id: string;
	text: string;
}

class ItemsExtension implements Extension<Item[]> {
	readonly name = 'items' as const;
	readonly state: Store<Item[]> = createStore<Item[]>([]);
	async setup(_api: ExtensionAPI): Promise<void> {}
}

class CounterExtension implements Extension<number> {
	readonly name = 'counter' as const;
	readonly state: Store<number> = createStore<number>(0);
	async setup(_api: ExtensionAPI): Promise<void> {}
}

class SharedCounterExtension implements Extension<number> {
	readonly name = 'counter' as const;
	readonly state: Store<number> = createSharedStore<number>(0);
	async setup(_api: ExtensionAPI): Promise<void> {}
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

	it('spawn() creates an agent with extension stores attached', async () => {
		const manager = new AgentManager(
			() => [new ItemsExtension()],
			createMockToolTransport(),
		);

		const { agent } = await manager.spawn(createMockTransport());
		track(agent);

		expect(agent.items).toBeDefined();
		expect(agent.items.get()).toEqual([]);
	});

	it('spawn() returns agentId alongside the agent', async () => {
		const manager = new AgentManager(
			() => [new ItemsExtension()],
			createMockToolTransport(),
		);

		const { agentId, agent } = await manager.spawn(createMockTransport());
		track(agent);

		expect(typeof agentId).toBe('string');
		expect(agentId.length).toBeGreaterThan(0);
	});

	it('spawn() calls factory each time to get fresh extensions', async () => {
		const factory = vi.fn(() => [new CounterExtension()]);
		const manager = new AgentManager(factory, createMockToolTransport());

		const { agent: a1 } = await manager.spawn(createMockTransport());
		const { agent: a2 } = await manager.spawn(createMockTransport());
		track(a1);
		track(a2);

		expect(factory).toHaveBeenCalledTimes(2);
		// Independent stores
		a1.counter.set(() => 42);
		expect(a2.counter.get()).toBe(0);
	});

	it('get() retrieves agent by ID', async () => {
		const manager = new AgentManager(
			() => [new ItemsExtension()],
			createMockToolTransport(),
		);

		const { agentId, agent } = await manager.spawn(createMockTransport());
		track(agent);

		const retrieved = manager.get(agentId);
		expect(retrieved).toBe(agent);
	});

	it('get() throws for unknown agent ID', () => {
		const manager = new AgentManager(
			() => [new ItemsExtension()],
			createMockToolTransport(),
		);

		expect(() => manager.get('nonexistent')).toThrow(
			'Agent nonexistent not found',
		);
	});

	it('child() creates agent with copied private stores', async () => {
		const manager = new AgentManager(
			() => [new CounterExtension()],
			createMockToolTransport(),
		);

		const { agentId: parentId, agent: parent } = await manager.spawn(
			createMockTransport(),
		);
		track(parent);
		parent.counter.set(() => 10);

		const { agent: child } = await manager.child(
			parentId,
			createMockTransport(),
		);
		track(child);

		// Child starts with a snapshot of parent's state
		expect(child.counter.get()).toBe(10);

		// But mutations are independent (PrivateStore → independent copy)
		child.counter.set(() => 99);
		expect(parent.counter.get()).toBe(10);
		expect(child.counter.get()).toBe(99);
	});

	it('child() shares SharedStore instances across parent/child', async () => {
		const manager = new AgentManager(
			() => [new SharedCounterExtension()],
			createMockToolTransport(),
		);

		const { agentId: parentId, agent: parent } = await manager.spawn(
			createMockTransport(),
		);
		track(parent);

		const { agent: child } = await manager.child(
			parentId,
			createMockTransport(),
		);
		track(child);

		// SharedStore.copy() returns `this`, so parent and child share state
		parent.counter.set(() => 42);
		expect(child.counter.get()).toBe(42);

		child.counter.set(() => 100);
		expect(parent.counter.get()).toBe(100);
	});

	it('multiple spawn() calls produce independent agents', async () => {
		const manager = new AgentManager(
			() => [new ItemsExtension(), new CounterExtension()],
			createMockToolTransport(),
		);

		const { agent: a1 } = await manager.spawn(createMockTransport());
		const { agent: a2 } = await manager.spawn(createMockTransport());
		const { agent: a3 } = await manager.spawn(createMockTransport());
		track(a1);
		track(a2);
		track(a3);

		a1.items.set((draft) => {
			draft.push({ id: '1', text: 'a1-item' });
		});
		a2.counter.set(() => 5);

		expect(a1.items.get()).toHaveLength(1);
		expect(a2.items.get()).toHaveLength(0);
		expect(a3.items.get()).toHaveLength(0);

		expect(a1.counter.get()).toBe(0);
		expect(a2.counter.get()).toBe(5);
		expect(a3.counter.get()).toBe(0);
	});
});
