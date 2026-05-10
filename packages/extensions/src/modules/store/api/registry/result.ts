import type { ForkMode } from '../sharing.js';
import type { StoreMapping } from '../../state.js';
import type { StoreRegistry } from './index.js';
import type { StoreEntry } from './types.js';

export class StoreResult {
	readonly registry: StoreRegistry;
	private readonly mapping: StoreMapping;

	constructor(registry: StoreRegistry, mapping: StoreMapping) {
		this.registry = registry;
		this.mapping = mapping;
	}

	get(name: string): StoreEntry | undefined {
		const ref = this.mapping[name];
		if (!ref) return undefined;
		return this.registry.get(ref);
	}

	has(name: string): boolean {
		return name in this.mapping;
	}

	*entries(): IterableIterator<[string, StoreEntry]> {
		for (const [name, ref] of Object.entries(this.mapping)) {
			yield [name, this.registry.get(ref)];
		}
	}

	share(mode: ForkMode = 'fresh'): StoreResult {
		const newMapping: StoreMapping = {};
		for (const [name, ref] of Object.entries(this.mapping)) {
			const entry = this.registry.get(ref);
			switch (entry.sharing) {
				case 'shared': {
					newMapping[name] = ref;
					break;
				}
				case 'private': {
					if (mode === 'copy') {
						const newEntry = this.registry.create(
							entry.sharing,
							entry.store.get(),
						);
						newMapping[name] = newEntry.ref;
					}
					// 'fresh': omit — child's registerStore creates from initial
					break;
				}
			}
		}
		return createStoreResult(this.registry, newMapping);
	}
}

/**
 * Rebuild a StoreResult from a serialized name -> ref mapping.
 */
export function createStoreResult(
	registry: StoreRegistry,
	mapping: StoreMapping,
): StoreResult {
	return new StoreResult(registry, mapping);
}

/**
 * Create an empty StoreResult backed by the given registry.
 */
export function createEmptyStoreResult(registry: StoreRegistry): StoreResult {
	return createStoreResult(registry, {});
}
