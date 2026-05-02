import { castDraft } from 'immer';
import { compilerFromApi } from '../../../algebra/compiler/from-api.js';
import type { Compiler } from '../../../algebra/compiler/types.js';
import type { StoreAPI, StoreAPISurface } from '../api/api.js';
import type { BaseStore } from '../api/base.js';
import type { StoreRegistry } from '../api/registry/index.js';
import type { StoreMapping } from '../api/registry/mapping.js';
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
	registry: StoreRegistry,
	state: StoreState,
): Compiler<StoreAPI, StoreRuntime> {
	const registrations: Registration[] = [];

	const api: StoreAPISurface = {
		registerStore(name: string, initial: unknown, sharing: Sharing): void {
			registrations.push({ name, initial, sharing });
		},
	};

	return compilerFromApi(api, async () => {
		const seedMapping = state.store;
		const hasEntries = Object.keys(seedMapping).length > 0;
		const seed = hasEntries
			? createStoreResult(registry, seedMapping)
			: createEmptyStoreResult(registry);

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
	});
}
