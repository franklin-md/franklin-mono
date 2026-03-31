import { describe, expect, it } from 'vitest';
import { createEmptyStoreResult } from '../../../api/store/registry/result.js';
import { StoreRegistry } from '../../../api/store/registry/index.js';
import { compile } from '../../types.js';
import { createStoreCompiler } from '../compiler.js';

describe('createStoreCompiler', () => {
	describe('registerStore', () => {
		it('creates a store with initial value', async () => {
			const registry = new StoreRegistry();
			const seed = createEmptyStoreResult(registry);

			const result = await compile(createStoreCompiler(seed), (api) => {
				api.registerStore('count', 42, 'private');
			});

			expect(result.stores.get('count')?.store.get()).toBe(42);
		});

		it('throws on duplicate creators', async () => {
			const registry = new StoreRegistry();
			const seed = createEmptyStoreResult(registry);

			await expect(
				compile(createStoreCompiler(seed), (api) => {
					api.registerStore('count', 1, 'private');
					api.registerStore('count', 2, 'private');
				}),
			).rejects.toThrow('Store "count" has multiple initializers');
		});
	});

	describe('useStore', () => {
		it('returns the same store instance as registerStore', async () => {
			const registry = new StoreRegistry();
			const seed = createEmptyStoreResult(registry);

			await compile(createStoreCompiler(seed), (api) => {
				const created = api.registerStore('x', 0, 'private');
				const used = api.useStore<number>('x');
				expect(created).toBe(used);
			});
		});

		it('works when consumer runs before creator', async () => {
			const registry = new StoreRegistry();
			const seed = createEmptyStoreResult(registry);

			await compile(createStoreCompiler(seed), (api) => {
				const used = api.useStore<number>('x');
				const created = api.registerStore('x', 99, 'private');
				expect(used).toBe(created);
				expect(used.get()).toBe(99);
			});
		});

		it('mutations from creator are visible to consumer', async () => {
			const registry = new StoreRegistry();
			const seed = createEmptyStoreResult(registry);

			await compile(createStoreCompiler(seed), (api) => {
				const store = api.registerStore('counter', 0, 'private');
				store.set(() => 42);
				const used = api.useStore<number>('counter');
				expect(used.get()).toBe(42);
			});
		});

		it('preserves sharing from creator', async () => {
			const registry = new StoreRegistry();
			const seed = createEmptyStoreResult(registry);

			const result = await compile(createStoreCompiler(seed), (api) => {
				api.registerStore('data', 1, 'shared');
				api.useStore<number>('data');
			});

			expect(result.stores.get('data')?.sharing).toBe('shared');
		});

		it('subscriber fires when creator initializes after consumer', async () => {
			const registry = new StoreRegistry();
			const seed = createEmptyStoreResult(registry);
			const values: number[] = [];

			await compile(createStoreCompiler(seed), (api) => {
				const store = api.useStore<number>('x');
				store.subscribe((v) => values.push(v));
				api.registerStore('x', 42, 'private');
			});

			expect(values).toContain(42);
		});
	});

	describe('build validation', () => {
		it('throws when a store is used but never initialized', async () => {
			const registry = new StoreRegistry();
			const seed = createEmptyStoreResult(registry);

			await expect(
				compile(createStoreCompiler(seed), (api) => {
					api.useStore<number>('orphan');
				}),
			).rejects.toThrow('Store "orphan" was registered but never initialized');
		});
	});

	describe('seed interaction', () => {
		it('useStore picks up seeded store without needing registerStore', async () => {
			const registry = new StoreRegistry();
			const parentResult = await compile(
				createStoreCompiler(createEmptyStoreResult(registry)),
				(api) => {
					api.registerStore('seeded', 99, 'shared');
				},
			);

			const childResult = await compile(
				createStoreCompiler(parentResult.stores),
				(api) => {
					const store = api.useStore<number>('seeded');
					expect(store.get()).toBe(99);
				},
			);

			expect(childResult.stores.get('seeded')?.store.get()).toBe(99);
		});

		it('registerStore picks up seeded store', async () => {
			const registry = new StoreRegistry();
			const parentResult = await compile(
				createStoreCompiler(createEmptyStoreResult(registry)),
				(api) => {
					api.registerStore('seeded', 99, 'shared');
				},
			);

			const childResult = await compile(
				createStoreCompiler(parentResult.stores),
				(api) => {
					const store = api.registerStore('seeded', 0, 'shared');
					expect(store.get()).toBe(99);
				},
			);

			expect(childResult.stores.get('seeded')?.store.get()).toBe(99);
		});
	});
});
