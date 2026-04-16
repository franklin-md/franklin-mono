import { describe, expect, it } from 'vitest';
import { createEmptyStoreResult } from '../../api/registry/result.js';
import { StoreRegistry } from '../../api/registry/index.js';
import { compile } from '../../../../algebra/compiler/compile.js';
import { createStoreCompiler } from '../compiler.js';
import type { StoreAPI } from '../../api/api.js';
import type { Extension } from '../../../../algebra/types/extension.js';

function freshSeed() {
	return createEmptyStoreResult(new StoreRegistry());
}

async function compileStore(ext: Extension<StoreAPI>) {
	return compile(createStoreCompiler(freshSeed()), ext);
}

describe('createStoreCompiler', () => {
	describe('registerStore', () => {
		it('creates a store with initial value', async () => {
			const result = await compileStore((api) => {
				api.registerStore('count', 42, 'private');
			});

			expect(result.stores.get('count')?.store.get()).toBe(42);
		});

		it('throws on duplicate creators', async () => {
			await expect(
				compileStore((api) => {
					api.registerStore('count', 1, 'private');
					api.registerStore('count', 2, 'private');
				}),
			).rejects.toThrow('Store "count" has multiple initializers');
		});
	});

	describe('useStore', () => {
		it('returns the same store instance as registerStore', async () => {
			await compileStore((api) => {
				const created = api.registerStore('x', 0, 'private');
				const used = api.useStore<number>('x');
				expect(created).toBe(used);
			});
		});

		it('works when consumer runs before creator', async () => {
			await compileStore((api) => {
				const used = api.useStore<number>('x');
				const created = api.registerStore('x', 99, 'private');
				expect(used).toBe(created);
				expect(used.get()).toBe(99);
			});
		});

		it('mutations from creator are visible to consumer', async () => {
			await compileStore((api) => {
				const store = api.registerStore('counter', 0, 'private');
				store.set(() => 42);
				const used = api.useStore<number>('counter');
				expect(used.get()).toBe(42);
			});
		});

		it('preserves sharing from creator', async () => {
			const result = await compileStore((api) => {
				api.registerStore('data', 1, 'shared');
				api.useStore<number>('data');
			});

			expect(result.stores.get('data')?.sharing).toBe('shared');
		});

		it('subscriber fires when creator initializes after consumer', async () => {
			const values: number[] = [];

			await compileStore((api) => {
				const store = api.useStore<number>('x');
				store.subscribe((v) => values.push(v));
				api.registerStore('x', 42, 'private');
			});

			expect(values).toContain(42);
		});
	});

	describe('build validation', () => {
		it('throws when a store is used but never initialized', async () => {
			await expect(
				compileStore((api) => {
					api.useStore<number>('orphan');
				}),
			).rejects.toThrow('Store "orphan" was registered but never initialized');
		});
	});

	describe('seed interaction', () => {
		it('useStore picks up seeded store without needing registerStore', async () => {
			const parentResult = await compileStore((api) => {
				api.registerStore('seeded', 99, 'shared');
			});

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
			const parentResult = await compileStore((api) => {
				api.registerStore('seeded', 99, 'shared');
			});

			const childResult = await compile(
				createStoreCompiler(parentResult.stores),
				(api) => {
					const store = api.registerStore('seeded', 0, 'shared');
					expect(store.get()).toBe(99);
				},
			);

			expect(childResult.stores.get('seeded')?.store.get()).toBe(99);
		});

		it('seeded value preserved regardless of useStore/registerStore order', async () => {
			// Parent creates store with initial 0, then mutates it to 99
			const parentResult = await compileStore((api) => {
				const store = api.registerStore('todos', 0, 'shared');
				store.set(() => 99);
			});

			// Child runs same extensions — useStore BEFORE registerStore
			// (simulates extension B consuming before extension A registers)
			const childResult = await compile(
				createStoreCompiler(parentResult.stores),
				(api) => {
					const consumed = api.useStore<number>('todos');
					const created = api.registerStore('todos', 0, 'shared');

					// Both should see the seeded value, not the initial 0
					expect(consumed.get()).toBe(99);
					expect(created.get()).toBe(99);
				},
			);

			expect(childResult.stores.get('todos')?.store.get()).toBe(99);
		});
	});
});
