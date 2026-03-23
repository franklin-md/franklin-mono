import { describe, it, expect } from 'vitest';
import { compile, combine, compileAll } from '../../types.js';
import { createStoreCompiler } from '../compiler.js';
import { createCoreCompiler } from '../../core/compiler.js';
import type { StoreResult } from '../../../api/store/result.js';
import type { Store } from '../../../api/store/types.js';
import type { StoreAPI } from '../../../api/store/api.js';
import type { CoreAPI } from '../../../api/core/api.js';

// ---------------------------------------------------------------------------
// Basic registration
// ---------------------------------------------------------------------------

describe('createStoreCompiler – registration', () => {
	it('registers a store and returns it in the result', async () => {
		const result = await compile(createStoreCompiler(), (api) => {
			api.registerStore('counter', 0);
		});

		expect(result.stores.size).toBe(1);
		const entry = result.stores.get('counter')!;
		expect(entry.store.get()).toBe(0);
		expect(entry.sharing).toBe('private');
	});

	it('returns the store to the extension for mutation', async () => {
		let store!: Store<number>;

		const result = await compile(createStoreCompiler(), (api) => {
			store = api.registerStore('counter', 0);
		});

		// Extension mutates the store
		store.set((draft) => {
			// Immer draft for primitives — return new value
			return draft + 1;
		});

		// Result's store is the same reference
		expect(result.stores.get('counter')!.store.get()).toBe(1);
	});

	it('registers multiple stores', async () => {
		const result = await compile(createStoreCompiler(), (api) => {
			api.registerStore('todos', []);
			api.registerStore('conversation', [], 'inherit');
			api.registerStore('config', {}, 'global');
		});

		expect(result.stores.size).toBe(3);
		expect(result.stores.get('todos')!.sharing).toBe('private');
		expect(result.stores.get('conversation')!.sharing).toBe('inherit');
		expect(result.stores.get('config')!.sharing).toBe('global');
	});

	it('throws on duplicate store name', async () => {
		await expect(
			compile(createStoreCompiler(), (api) => {
				api.registerStore('x', 0);
				api.registerStore('x', 0);
			}),
		).rejects.toThrow('Store "x" is already registered');
	});
});

// ---------------------------------------------------------------------------
// Copy semantics
// ---------------------------------------------------------------------------

describe('createStoreCompiler – copy()', () => {
	async function buildResult(): Promise<StoreResult> {
		return compile(createStoreCompiler(), (api) => {
			api.registerStore('priv', { value: 'private-data' }, 'private');
			api.registerStore('inh', { value: 'inherit-data' }, 'inherit');
			api.registerStore('glob', { value: 'global-data' }, 'global');
		});
	}

	it('copy("private") snapshots private + inherit, keeps global', async () => {
		const parent = await buildResult();
		const child = parent.copy('private');

		// Global: same reference
		expect(child.stores.get('glob')!.store).toBe(
			parent.stores.get('glob')!.store,
		);

		// Private: independent snapshot
		expect(child.stores.get('priv')!.store).not.toBe(
			parent.stores.get('priv')!.store,
		);
		expect(child.stores.get('priv')!.store.get()).toEqual({
			value: 'private-data',
		});

		// Inherit: most restrictive of inherit + private = private → snapshot
		expect(child.stores.get('inh')!.store).not.toBe(
			parent.stores.get('inh')!.store,
		);
	});

	it('copy("inherit") snapshots private, shares inherit + global', async () => {
		const parent = await buildResult();
		const child = parent.copy('inherit');

		// Global: same reference
		expect(child.stores.get('glob')!.store).toBe(
			parent.stores.get('glob')!.store,
		);

		// Inherit: most restrictive of inherit + inherit = inherit → same ref
		expect(child.stores.get('inh')!.store).toBe(
			parent.stores.get('inh')!.store,
		);

		// Private: most restrictive of private + inherit = private → snapshot
		expect(child.stores.get('priv')!.store).not.toBe(
			parent.stores.get('priv')!.store,
		);
	});

	it('copy("global") snapshots private, shares inherit + global', async () => {
		const parent = await buildResult();
		const child = parent.copy('global');

		// Global: same reference
		expect(child.stores.get('glob')!.store).toBe(
			parent.stores.get('glob')!.store,
		);

		// Inherit: most restrictive of inherit + global = inherit → same ref
		expect(child.stores.get('inh')!.store).toBe(
			parent.stores.get('inh')!.store,
		);

		// Private: most restrictive of private + global = private → snapshot
		expect(child.stores.get('priv')!.store).not.toBe(
			parent.stores.get('priv')!.store,
		);
	});

	it('snapshotted stores are independent from parent', async () => {
		const parent = await buildResult();
		const child = parent.copy('private');

		// Mutate parent store
		parent.stores.get('priv')!.store.set(() => ({ value: 'changed' }));

		// Child should still have original value
		expect(child.stores.get('priv')!.store.get()).toEqual({
			value: 'private-data',
		});
	});

	it('shared stores reflect mutations across parent and child', async () => {
		const parent = await buildResult();
		const child = parent.copy('inherit');

		// Mutate via child's inherit store (same ref as parent's)
		child.stores.get('inh')!.store.set(() => ({ value: 'mutated-by-child' }));

		// Parent should see the change
		expect(parent.stores.get('inh')!.store.get()).toEqual({
			value: 'mutated-by-child',
		});
	});

	it('preserves sharing metadata on copied entries', async () => {
		const parent = await buildResult();
		const child = parent.copy('private');

		expect(child.stores.get('priv')!.sharing).toBe('private');
		expect(child.stores.get('inh')!.sharing).toBe('inherit');
		expect(child.stores.get('glob')!.sharing).toBe('global');
	});
});

// ---------------------------------------------------------------------------
// Existing stores (child agent spawning)
// ---------------------------------------------------------------------------

describe('createStoreCompiler – existing stores', () => {
	it('reuses stores from existing StoreResult', async () => {
		// Parent compiles and produces a result
		const parent = await compile(createStoreCompiler(), (api) => {
			const s = api.registerStore('counter', 0);
			s.set(() => 42);
		});

		// Copy for child
		const copied = parent.copy('inherit');

		// Child compiles with existing stores
		const child = await compile(
			createStoreCompiler(copied),
			(api: StoreAPI) => {
				const s = api.registerStore('counter', 0);
				// Should have parent's value, not initial
				expect(s.get()).toBe(42);
			},
		);

		expect(child.stores.get('counter')!.store.get()).toBe(42);
	});

	it('creates fresh stores for names not in existing', async () => {
		const parent = await compile(createStoreCompiler(), (api) => {
			api.registerStore('counter', 0);
		});

		const copied = parent.copy('inherit');

		const child = await compile(
			createStoreCompiler(copied),
			(api: StoreAPI) => {
				api.registerStore('counter', 0); // reused
				api.registerStore('newStore', 'fresh'); // fresh
			},
		);

		expect(child.stores.get('newStore')!.store.get()).toBe('fresh');
	});
});

// ---------------------------------------------------------------------------
// Composition with core compiler
// ---------------------------------------------------------------------------

describe('createStoreCompiler – combine with core', () => {
	it('extension sees both CoreAPI and StoreAPI', async () => {
		const result = await compile(
			combine(createCoreCompiler(), createStoreCompiler()),
			(api: CoreAPI & StoreAPI) => {
				api.registerStore('items', [] as string[]);
				api.on('prompt', (params) => params);
			},
		);

		// Core compiler produced middleware
		expect(result.client).toBeDefined();

		// Store compiler produced stores
		expect(result.stores.size).toBe(1);
		expect(result.stores.get('items')!.store.get()).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// compileAll with store compiler
// ---------------------------------------------------------------------------

describe('compileAll – store compiler', () => {
	it('compiles 0 extensions to empty stores', async () => {
		const result = await compileAll(createStoreCompiler(), []);
		expect(result.stores.size).toBe(0);
	});

	it('compiles N extensions, unions all stores', async () => {
		const ext1 = (api: StoreAPI) => {
			api.registerStore('todos', [] as string[]);
		};
		const ext2 = (api: StoreAPI) => {
			api.registerStore('conversation', [] as string[]);
		};
		const ext3 = (api: StoreAPI) => {
			api.registerStore('config', {});
		};

		const result = await compileAll(createStoreCompiler(), [ext1, ext2, ext3]);

		expect(result.stores.size).toBe(3);
		expect(result.stores.has('todos')).toBe(true);
		expect(result.stores.has('conversation')).toBe(true);
		expect(result.stores.has('config')).toBe(true);
	});

	it('compileAll with combined compiler merges both middleware and stores', async () => {
		const ext1 = (api: CoreAPI & StoreAPI) => {
			api.registerStore('todos', [] as string[]);
			api.on('prompt', () => {
				/* side effect */
			});
		};

		const ext2 = (api: CoreAPI & StoreAPI) => {
			api.registerStore('conv', [] as string[]);
		};

		const result = await compileAll(
			combine(createCoreCompiler(), createStoreCompiler()),
			[ext1, ext2],
		);

		expect(result.stores.size).toBe(2);
		expect(result.client).toBeDefined();
	});
});
