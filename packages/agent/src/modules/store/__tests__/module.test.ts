import { describe, it, expect } from 'vitest';
import { createStoreModule } from '../module.js';
import { createStoreStateModule } from '../state-module.js';
import { storeMappingHandle } from '../runtime.js';
import { compile } from '@franklin/extensibility';
import { createRuntime } from '../../../testing/index.js';
import { StoreRegistry } from '../api/registry/index.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createStoreModule', () => {
	it('creates a runtime with stores from a mapping seed', async () => {
		const registry = new StoreRegistry();
		const parentModule = createStoreModule(registry);
		const parent = await compile(
			parentModule.extensionPoint,
			parentModule.compiler,
			(api) => {
				api.registerStore('count', 42, 'private');
			},
		);
		const mapping = await storeMappingHandle(parent).get();

		const childModule = createStoreModule(registry, mapping);
		const runtime = await compile(
			childModule.extensionPoint,
			childModule.compiler,
			(api) => {
				api.registerStore('count', 0, 'private');
			},
		);

		expect(runtime.getStore<number>('count').get()).toBe(42);
	});
});

describe('createStoreStateModule', () => {
	it('create returns a runtime with stores', async () => {
		const system = createStoreStateModule(new StoreRegistry());

		const runtime = await createRuntime(system, { store: {} }, [
			(api) => {
				api.registerStore('count', 0, 'private');
			},
		]);

		expect(runtime.getStore<number>('count').get()).toBe(0);
	});

	it('state returns store mapping keyed under "store"', async () => {
		const system = createStoreStateModule(new StoreRegistry());

		const runtime = await createRuntime(system, { store: {} }, [
			(api) => {
				api.registerStore('x', 1, 'shared');
			},
		]);

		const state = await system.state(runtime).get();
		expect(state.store).toBeDefined();
		expect(Object.keys(state.store)).toContain('x');
		expect(typeof state.store['x']).toBe('string');
	});

	it('fork produces copy-mode mapping', async () => {
		const system = createStoreStateModule(new StoreRegistry());

		const runtime = await createRuntime(system, { store: {} }, [
			(api) => {
				api.registerStore('data', 42, 'private');
				api.registerStore('shared', 10, 'shared');
			},
		]);

		runtime.getStore<number>('data').set(() => 99);

		const forked = await system.state(runtime).fork();

		expect(Object.keys(forked.store)).toContain('data');
		expect(Object.keys(forked.store)).toContain('shared');

		const origState = await system.state(runtime).get();
		expect(forked.store['shared']).toBe(origState.store['shared']);
		expect(forked.store['data']).not.toBe(origState.store['data']);
	});

	it('child produces fresh-mode mapping (private stores omitted)', async () => {
		const system = createStoreStateModule(new StoreRegistry());

		const runtime = await createRuntime(system, { store: {} }, [
			(api) => {
				api.registerStore('data', 42, 'private');
				api.registerStore('shared', 10, 'shared');
			},
		]);

		const childState = await system.state(runtime).child();

		expect(Object.keys(childState.store)).toContain('shared');
		expect(Object.keys(childState.store)).not.toContain('data');
	});

	it('restore from existing mapping', async () => {
		const registry = new StoreRegistry();
		const system = createStoreStateModule(registry);

		const runtime1 = await createRuntime(system, { store: {} }, [
			(api) => {
				api.registerStore('count', 42, 'private');
			},
		]);
		const snapshot = await system.state(runtime1).get();

		const runtime2 = await createRuntime(system, snapshot, [
			(api) => {
				api.registerStore('count', 0, 'private');
			},
		]);

		expect(runtime2.getStore<number>('count').get()).toBe(42);
	});

	it('emptyState returns empty keyed mapping', () => {
		const system = createStoreStateModule(new StoreRegistry());
		const empty = system.emptyState();

		expect(empty.store).toEqual({});
	});
});
