import type { Compiler } from '@franklin/extensibility';
import type { RegistryView } from '@franklin/extensibility';
import type { BaseRuntime } from '@franklin/extensibility';
import type { StoreSignature } from '../api/api.js';
import type { StoreRegistry as RuntimeStoreRegistry } from '../api/registry/index.js';
import type { StoreMapping } from '../api/registry/mapping.js';
import { createStoreResult } from '../api/registry/result.js';
import { createStoreRuntime, type StoreRuntime } from '../runtime.js';

/**
 * Store compiler — registrations are pure writes captured as data.
 * State is closure-captured at compiler-creation time; at build time,
 * stores are materialised from seed + registrations and handlers access
 * them at stage 1 via `runtime.getStore(key)`.
 */
export function createStoreCompiler(
	storeRegistry: RuntimeStoreRegistry,
	seedMapping: StoreMapping = {},
): Compiler<StoreSignature, StoreRuntime> {
	return {
		async compile<ContextRuntime extends BaseRuntime>(
			registry: RegistryView<StoreSignature, ContextRuntime>,
		) {
			const registrations = registry.argsFor('registerStore');
			const mapping: StoreMapping = {};
			const seen = new Set<string>();

			for (const [name] of registrations) {
				if (seen.has(name)) {
					throw new Error(`Store "${name}" has multiple initializers`);
				}
				seen.add(name);
			}

			for (const [name, initial, sharing, codec] of registrations) {
				const ref = seedMapping[name] ?? storeRegistry.create(sharing).ref;
				mapping[name] = ref;
				await storeRegistry.prepare(ref, { name, initial, sharing, codec });
			}

			const stores = createStoreResult(storeRegistry, mapping);
			return createStoreRuntime(stores);
		},
	};
}
