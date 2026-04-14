import type {
	SessionCollection,
	Session,
	SessionCreate,
	SessionEvent,
} from '@franklin/extensions';
import type { FranklinRuntime, FranklinSystem } from '../types.js';

export type Agents = {
	create: SessionCreate<FranklinSystem>;
	get(id: string): Session<FranklinRuntime> | undefined;
	list(): Session<FranklinRuntime>[];
	remove(id: string): Promise<boolean>;
	subscribe(
		listener: (event: SessionEvent<FranklinRuntime>) => void,
	): () => void;
};

export function createAgents(
	create: SessionCreate<FranklinSystem>,
	collection: SessionCollection<FranklinRuntime>,
): Agents {
	return {
		create,
		get: (id) => collection.get(id),
		list: () => collection.list(),
		remove: (id) => collection.remove(id),
		subscribe: (listener) => collection.subscribe(listener),
	};
}
