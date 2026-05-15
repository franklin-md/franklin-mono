import { castDraft } from 'immer';
import type { Compiler } from '../../../algebra/compiler/types.js';
import type { Registry } from '../../../algebra/extension-points/registry.js';
import type { BaseRuntime } from '../../../algebra/runtime/index.js';
import type { StoreAPI } from '../api/api.js';
import type { BaseStore } from '../api/base.js';
import type { StoreRegistry as RuntimeStoreRegistry } from '../api/registry/index.js';
import type { StoreMapping } from '../state.js';
import {
	createEmptyStoreResult,
	createStoreResult,
} from '../api/registry/result.js';
import type { Sharing } from '../api/sharing.js';
import { createStoreRuntime, type StoreRuntime } from '../runtime.js';
import type { StoreState } from '../state.js';

type Registration = {
	name: string;
	initial: unknown;
	sharing: Sharing;
};

/**
 * Store compiler — registrations are pure writes captured as data.
 * State is closure-captured at compiler-creation time; at build time,
 * stores are materialised from seed + registrations and handlers access
 * them at stage 1 via `runtime.getStore(key)`.
 */
export function createStoreCompiler(
	storeRegistry: RuntimeStoreRegistry,
	state: StoreState,
): Compiler<StoreAPI, StoreRuntime> {
	return {
		async compile<ContextRuntime extends BaseRuntime>(
			registry: Registry<StoreAPI, ContextRuntime>,
		) {
			const registrations = registry.registerStore.map(
				([name, initial, sharing]) =>
					({ name, initial, sharing }) satisfies Registration,
			);
			const seedMapping = state.store;
			const hasEntries = Object.keys(seedMapping).length > 0;
			const seed = hasEntries
				? createStoreResult(storeRegistry, seedMapping)
				: createEmptyStoreResult(storeRegistry);

			const mapping: StoreMapping = {};
			const seen = new Set<string>();

			for (const { name, initial, sharing } of registrations) {
				if (seen.has(name)) {
					throw new Error(`Store "${name}" has multiple initializers`);
				}
				seen.add(name);

				let ref = mapping[name];
				if (ref === undefined) {
					const seeded = seed.get(name);
					ref = seeded ? seeded.ref : seed.registry.create(sharing).ref;
					mapping[name] = ref;
				}
				const entry = seed.registry.get(ref);
				entry.sharing = sharing;
				// TODO: can we avoid this?
				// TODO: Is BaseStore actually base type? OR is it concrete?
				(entry.store as BaseStore<unknown>).setInitial(castDraft(initial));
			}

			const stores = createStoreResult(seed.registry, mapping);
			return createStoreRuntime(stores);
		},
	};
}
