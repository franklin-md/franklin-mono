import type { StoreRegistry } from './index.js';
import type { StoreEntry, StoreMapping } from './types.js';

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

	share(): StoreResult {
		const newMapping: StoreMapping = {};
		for (const [name, ref] of Object.entries(this.mapping)) {
			const entry = this.registry.get(ref);
			switch (entry.sharing) {
				// Create a new pool entry with a snapshot of the current value
				case 'private': {
					const data = entry.store.get();
					const newEntry = this.registry.create(data, entry.sharing);
					newMapping[name] = newEntry.ref;
					break;
				}
				case 'inherit': {
					// Share the same pool entry
					newMapping[name] = ref;
					break;
				}
				case 'global': {
					throw new Error('Global sharing is no longer supported');
				}
			}
		}
		return new StoreResult(this.registry, newMapping);
	}
}

/**
 * Create an empty StoreResult backed by the given registry.
 */
export function createEmptyStoreResult(
	registry: StoreRegistry,
): StoreResult {
	return new StoreResult(registry, {});
}
