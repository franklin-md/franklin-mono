import { describe, expect, it } from 'vitest';
import { StoreRegistry } from '../../api/registry/index.js';
import { compile } from '../../../../algebra/compiler/compile.js';
import { createStoreCompiler } from '../compiler.js';
import { storeStateHandle } from '../../runtime.js';
import type { StoreAPI } from '../../api/api.js';
import type { Extension } from '../../../../algebra/types/extension.js';
import type { StoreMapping } from '../../api/registry/mapping.js';

function compileStore(ext: Extension<StoreAPI>, seed: StoreMapping = {}) {
	return compile(
		createStoreCompiler(new StoreRegistry(), { store: seed }),
		ext,
	);
}

describe('createStoreCompiler', () => {
	describe('registerStore', () => {
		it('creates a store with the declared initial value', async () => {
			const runtime = await compileStore((api) => {
				api.registerStore('count', 42, 'private');
			});

			expect(runtime.getStore<number>('count').get()).toBe(42);
		});

		it('supports multiple stores', async () => {
			const runtime = await compileStore((api) => {
				api.registerStore('a', 1, 'private');
				api.registerStore('b', 'hello', 'shared');
			});

			expect(runtime.getStore<number>('a').get()).toBe(1);
			expect(runtime.getStore<string>('b').get()).toBe('hello');
		});

		it('throws on duplicate registrations of the same name', async () => {
			await expect(
				compileStore((api) => {
					api.registerStore('count', 1, 'private');
					api.registerStore('count', 2, 'private');
				}),
			).rejects.toThrow('Store "count" has multiple initializers');
		});
	});

	describe('getStore (runtime)', () => {
		it('throws when looking up an unregistered store', async () => {
			const runtime = await compileStore(() => {});
			expect(() => runtime.getStore<number>('missing')).toThrow(
				'Store "missing" was not registered',
			);
		});

		it('returns the same handle for repeated lookups', async () => {
			const runtime = await compileStore((api) => {
				api.registerStore('x', 0, 'private');
			});

			const a = runtime.getStore<number>('x');
			const b = runtime.getStore<number>('x');
			expect(a).toBe(b);
		});

		it('mutations through the handle persist', async () => {
			const runtime = await compileStore((api) => {
				api.registerStore('counter', 0, 'private');
			});

			const store = runtime.getStore<number>('counter');
			store.set(() => 42);

			expect(runtime.getStore<number>('counter').get()).toBe(42);
		});
	});

	describe('fork / child', () => {
		it('fork preserves shared stores and copies private ones', async () => {
			const runtime = await compileStore((api) => {
				api.registerStore('shared_k', 'SHARED', 'shared');
				api.registerStore('private_k', 100, 'private');
			});

			const forked = await storeStateHandle(runtime).fork();
			expect(forked.store).toBeDefined();
			expect(forked.store.shared_k).toBeDefined();
			expect(forked.store.private_k).toBeDefined();
		});

		it('child drops private stores, keeps shared refs', async () => {
			const runtime = await compileStore((api) => {
				api.registerStore('shared_k', 'S', 'shared');
				api.registerStore('private_k', 1, 'private');
			});

			const childState = await storeStateHandle(runtime).child();
			expect(childState.store.shared_k).toBeDefined();
			expect(childState.store.private_k).toBeUndefined();
		});
	});

	describe('seed interaction', () => {
		it('stores initialised from the seed state preserve their value', async () => {
			// Parent and child must share a registry for refs in the seed mapping
			// to resolve — the registry is the backing store for all entries.
			const registry = new StoreRegistry();
			const parent = await compile(
				createStoreCompiler(registry, { store: {} }),
				(api) => {
					api.registerStore('seeded', 99, 'shared');
				},
			);

			const parentState = await storeStateHandle(parent).get();

			const child = await compile(
				createStoreCompiler(registry, { store: parentState.store }),
				(api) => {
					api.registerStore('seeded', 0, 'shared');
				},
			);

			expect(child.getStore<number>('seeded').get()).toBe(99);
		});

		it('overwriting initial in a new compile does not clobber seeded value', async () => {
			const registry = new StoreRegistry();
			const parent = await compile(
				createStoreCompiler(registry, { store: {} }),
				(api) => {
					api.registerStore('todos', 0, 'shared');
				},
			);

			// Mutate in the parent before sharing (simulate real usage)
			parent.getStore<number>('todos').set(() => 99);
			const snapshot = await storeStateHandle(parent).get();

			const child = await compile(
				createStoreCompiler(registry, { store: snapshot.store }),
				(api) => {
					api.registerStore('todos', 0, 'shared');
				},
			);

			expect(child.getStore<number>('todos').get()).toBe(99);
		});
	});
});
