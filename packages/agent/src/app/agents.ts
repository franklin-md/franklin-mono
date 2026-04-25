import type {
	SessionCollection,
	Session,
	SessionCreate,
	SessionCreateInput,
	SessionEvent,
} from '@franklin/extensions';
import type { FranklinRuntime, FranklinSystem } from '../types.js';

export type AgentCreateInput = SessionCreateInput<FranklinSystem>;
export type AgentCreate = SessionCreate<FranklinSystem>;

export type Agents = {
	create: AgentCreate;
	get(id: string): Session<FranklinRuntime> | undefined;
	list(): Session<FranklinRuntime>[];
	remove(id: string): Promise<boolean>;
	subscribe(
		listener: (event: SessionEvent<FranklinRuntime>) => void,
	): () => void;
};

export function createAgents(
	create: AgentCreate,
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
