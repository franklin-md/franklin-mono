import { describe, expect, it, vi } from 'vitest';

import type {
	AdapterEventHandler,
	ManagedAgentCommandResult,
} from '@franklin/managed-agent';

import { AgentManager } from '../agent-manager.js';
import { InMemoryAgentStore } from '../store.js';
import type { AdapterFactory } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mock adapter factory that captures the onEvent handler
 * so tests can simulate adapter events.
 */
function createMockFactory(): {
	factory: AdapterFactory;
	getLastOnEvent: () => AdapterEventHandler;
} {
	let lastOnEvent: AdapterEventHandler | undefined;

	const factory: AdapterFactory = (_kind, options) => {
		lastOnEvent = options.onEvent;
		return {
			dispatch: vi.fn(async () => ({ ok: true }) as ManagedAgentCommandResult),
			dispose: vi.fn(async () => {}),
		};
	};

	return {
		factory,
		getLastOnEvent: () => {
			if (!lastOnEvent) throw new Error('Factory not called yet');
			return lastOnEvent;
		},
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgentManager', () => {
	// -----------------------------------------------------------------------
	// Create
	// -----------------------------------------------------------------------

	describe('create', () => {
		it('returns a handle with initial status created', async () => {
			const { factory } = createMockFactory();
			const mgr = new AgentManager({ adapterFactory: factory });

			const handle = await mgr.create('a1', {
				adapterKind: 'mock',
				sessionSpec: {},
			});

			expect(handle.agentId).toBe('a1');
			expect(handle.status).toBe('created');
		});

		it('throws if agent ID already exists', async () => {
			const { factory } = createMockFactory();
			const mgr = new AgentManager({ adapterFactory: factory });

			await mgr.create('a1', {
				adapterKind: 'mock',
				sessionSpec: {},
			});

			await expect(
				mgr.create('a1', { adapterKind: 'mock', sessionSpec: {} }),
			).rejects.toThrow('Agent "a1" already exists');
		});

		it('persists metadata to store', async () => {
			const store = new InMemoryAgentStore();
			const { factory } = createMockFactory();
			const mgr = new AgentManager({ adapterFactory: factory, store });

			await mgr.create('a1', {
				adapterKind: 'mock',
				sessionSpec: {},
			});

			const meta = await store.loadMetadata('a1');
			expect(meta).toBeDefined();
			expect(meta!.agentId).toBe('a1');
			expect(meta!.adapterKind).toBe('mock');
			expect(meta!.status).toBe('created');
		});

		it('routes adapter events to handle', async () => {
			const { factory, getLastOnEvent } = createMockFactory();
			const mgr = new AgentManager({ adapterFactory: factory });

			const handle = await mgr.create('a1', {
				adapterKind: 'mock',
				sessionSpec: {},
			});

			// Simulate adapter emitting turn.completed
			getLastOnEvent()({ type: 'turn.completed' });
			expect(handle.status).toBe('idle');
		});
	});

	// -----------------------------------------------------------------------
	// Resume
	// -----------------------------------------------------------------------

	describe('resume', () => {
		it('returns same handle reference for live agent', async () => {
			const { factory } = createMockFactory();
			const mgr = new AgentManager({ adapterFactory: factory });

			const h1 = await mgr.create('a1', {
				adapterKind: 'mock',
				sessionSpec: {},
			});
			const h2 = await mgr.resume('a1');

			expect(h2).toBe(h1); // same object reference
		});

		it('recreates handle from store for non-live agent', async () => {
			const store = new InMemoryAgentStore();
			const { factory } = createMockFactory();

			// Create agent in one manager instance
			const mgr1 = new AgentManager({ adapterFactory: factory, store });
			const h1 = await mgr1.create('a1', {
				adapterKind: 'mock',
				sessionSpec: {},
			});
			// Simulate process restart — h1 is gone from memory but metadata is in store
			// Use a fresh manager with same store
			const mgr2 = new AgentManager({ adapterFactory: factory, store });

			const h2 = await mgr2.resume('a1');
			expect(h2.agentId).toBe('a1');
			expect(h2).not.toBe(h1); // different object (different manager)
		});

		it('throws if agent not found in store', async () => {
			const { factory } = createMockFactory();
			const mgr = new AgentManager({ adapterFactory: factory });

			await expect(mgr.resume('nonexistent')).rejects.toThrow(
				'No agent found for id "nonexistent"',
			);
		});
	});

	// -----------------------------------------------------------------------
	// Get
	// -----------------------------------------------------------------------

	describe('get', () => {
		it('returns handle for live agent', async () => {
			const { factory } = createMockFactory();
			const mgr = new AgentManager({ adapterFactory: factory });

			const handle = await mgr.create('a1', {
				adapterKind: 'mock',
				sessionSpec: {},
			});

			expect(mgr.get('a1')).toBe(handle);
		});

		it('returns undefined for unknown agent', () => {
			const { factory } = createMockFactory();
			const mgr = new AgentManager({ adapterFactory: factory });

			expect(mgr.get('nonexistent')).toBeUndefined();
		});
	});

	// -----------------------------------------------------------------------
	// List
	// -----------------------------------------------------------------------

	describe('list', () => {
		it('returns all metadata from store', async () => {
			const { factory } = createMockFactory();
			const mgr = new AgentManager({ adapterFactory: factory });

			await mgr.create('a1', {
				adapterKind: 'mock',
				sessionSpec: {},
			});
			await mgr.create('a2', {
				adapterKind: 'mock',
				sessionSpec: {},
			});

			const list = await mgr.list();
			expect(list).toHaveLength(2);
			expect(list.map((m) => m.agentId).sort()).toEqual(['a1', 'a2']);
		});
	});

	// -----------------------------------------------------------------------
	// Remove
	// -----------------------------------------------------------------------

	describe('remove', () => {
		it('disposes handle and removes from store', async () => {
			const store = new InMemoryAgentStore();
			const { factory } = createMockFactory();
			const mgr = new AgentManager({ adapterFactory: factory, store });

			await mgr.create('a1', {
				adapterKind: 'mock',
				sessionSpec: {},
			});
			await mgr.remove('a1');

			expect(mgr.get('a1')).toBeUndefined();
			expect(await store.loadMetadata('a1')).toBeUndefined();
		});

		it('does not throw for non-live agent with stored data', async () => {
			const store = new InMemoryAgentStore();
			const { factory } = createMockFactory();

			// Create via one manager, remove via another (no live handle)
			const mgr1 = new AgentManager({ adapterFactory: factory, store });
			await mgr1.create('a1', {
				adapterKind: 'mock',
				sessionSpec: {},
			});

			const mgr2 = new AgentManager({ adapterFactory: factory, store });
			await mgr2.remove('a1');

			expect(await store.loadMetadata('a1')).toBeUndefined();
		});
	});

	// -----------------------------------------------------------------------
	// DisposeAll
	// -----------------------------------------------------------------------

	describe('disposeAll', () => {
		it('disposes all live handles', async () => {
			const { factory } = createMockFactory();
			const mgr = new AgentManager({ adapterFactory: factory });

			const h1 = await mgr.create('a1', {
				adapterKind: 'mock',
				sessionSpec: {},
			});
			const h2 = await mgr.create('a2', {
				adapterKind: 'mock',
				sessionSpec: {},
			});

			await mgr.disposeAll();

			expect(h1.status).toBe('disposed');
			expect(h2.status).toBe('disposed');
			expect(mgr.get('a1')).toBeUndefined();
			expect(mgr.get('a2')).toBeUndefined();
		});
	});
});
