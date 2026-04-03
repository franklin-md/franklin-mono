import type { Store } from '../../api/store/types.js';
import type { StoreAPI } from '../../api/store/api.js';
import type { Sharing } from '../../api/store/sharing.js';
import type { Compiler } from '../types.js';
import type { StoreMapping } from '../../api/store/registry/mapping.js';
import { castDraft } from 'immer';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { BaseStore } from '../../api/store/base.js';
import {
	type StoreResult,
	createStoreResult,
} from '../../api/store/registry/result.js';
import { createStoreRuntime, type StoreRuntime } from '../../runtime/store.js';

/**
 * Create a fresh store compiler instance.
 *
 * Extensions interact via two methods:
 * - `registerStore(name, initial, sharing)` — declares a store with an
 *   initial value and sharing mode. Exactly one extension should register
 *   each store name; duplicates throw.
 * - `useStore(name)` — attaches to a store registered (or to-be-registered)
 *   by another extension. Order-independent: works whether the creator
 *   has already run or not.
 *
 * At build time the compiler validates that every store has been
 * initialised — either by a `registerStore` call or by the seed.
 */
export function createStoreCompiler(
	seed: StoreResult,
): Compiler<StoreAPI, StoreRuntime> {
	const mapping: StoreMapping = {};
	const creators = new Set<string>();

	function resolve<T>(name: string, initial?: T, sharing?: Sharing): Store<T> {
		const isCreator = sharing !== undefined;

		// Phase 1: Ensure the store exists and is mapped
		let ref = mapping[name];
		if (ref === undefined) {
			const seeded = seed.get(name);
			if (seeded) {
				ref = seeded.ref;
			} else {
				const created = seed.registry.create(isCreator ? sharing : 'private');
				ref = created.ref;
			}
			mapping[name] = ref;
		}

		const entry = seed.registry.get(ref);

		// Phase 2: Apply creator metadata
		if (isCreator) {
			if (creators.has(name)) {
				throw new Error(`Store "${name}" has multiple initializers`);
			}
			entry.sharing = sharing;
			(entry.store as BaseStore<T>).setInitial(castDraft(initial) as T);
			creators.add(name);
		}

		return entry.store as Store<T>;
	}

	const api: StoreAPI = {
		registerStore<T>(name: string, initial: T, sharing: Sharing): Store<T> {
			return resolve(name, initial, sharing);
		},
		useStore<T>(name: string): Store<T> {
			return resolve<T>(name);
		},
	};

	return {
		api,
		async build() {
			for (const name of Object.keys(mapping)) {
				if (!creators.has(name) && !seed.has(name)) {
					throw new Error(
						`Store "${name}" was registered but never initialized`,
					);
				}
			}
			const stores = createStoreResult(seed.registry, mapping);
			return createStoreRuntime(stores);
		},
	};
}
