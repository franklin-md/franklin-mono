import { describe, it, expect } from 'vitest';
import { createStoreSystem } from '../system.js';
import { createRuntime } from '../../../algebra/system/create.js';
import { StoreRegistry } from '../api/registry/index.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createStoreSystem', () => {
	it('create returns a runtime with stores', async () => {
		const system = createStoreSystem(new StoreRegistry());

		const runtime = await createRuntime(system, { store: {} }, [
			(api) => {
				api.registerStore('count', 0, 'private');
			},
		]);

		expect(runtime.getStore<number>('count').get()).toBe(0);
	});

	it('state returns store mapping keyed under "store"', async () => {
		const system = createStoreSystem(new StoreRegistry());

		const runtime = await createRuntime(system, { store: {} }, [
			(api) => {
				api.registerStore('x', 1, 'shared');
			},
		]);

		const state = await runtime.state();
		expect(state.store).toBeDefined();
		expect(Object.keys(state.store)).toContain('x');
		expect(typeof state.store['x']).toBe('string');
	});

	it('fork produces copy-mode mapping', async () => {
		const system = createStoreSystem(new StoreRegistry());

		const runtime = await createRuntime(system, { store: {} }, [
			(api) => {
				api.registerStore('data', 42, 'private');
				api.registerStore('shared', 10, 'shared');
			},
		]);

		runtime.getStore<number>('data').set(() => 99);

		const forked = await runtime.fork();

		expect(Object.keys(forked.store)).toContain('data');
		expect(Object.keys(forked.store)).toContain('shared');

		const origState = await runtime.state();
		expect(forked.store['shared']).toBe(origState.store['shared']);
		expect(forked.store['data']).not.toBe(origState.store['data']);
	});

	it('child produces fresh-mode mapping (private stores omitted)', async () => {
		const system = createStoreSystem(new StoreRegistry());

		const runtime = await createRuntime(system, { store: {} }, [
			(api) => {
				api.registerStore('data', 42, 'private');
				api.registerStore('shared', 10, 'shared');
			},
		]);

		const childState = await runtime.child();

		expect(Object.keys(childState.store)).toContain('shared');
		expect(Object.keys(childState.store)).not.toContain('data');
	});

	it('restore from existing mapping', async () => {
		const registry = new StoreRegistry();
		const system = createStoreSystem(registry);

		const runtime1 = await createRuntime(system, { store: {} }, [
			(api) => {
				api.registerStore('count', 42, 'private');
			},
		]);
		const snapshot = await runtime1.state();

		const runtime2 = await createRuntime(system, snapshot, [
			(api) => {
				api.registerStore('count', 0, 'private');
			},
		]);

		expect(runtime2.getStore<number>('count').get()).toBe(42);
	});

	it('emptyState returns empty keyed mapping', () => {
		const system = createStoreSystem(new StoreRegistry());
		const empty = system.emptyState();

		expect(empty.store).toEqual({});
	});
});
