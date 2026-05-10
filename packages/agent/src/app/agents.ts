import type {
	OrchestratorCreateInput,
	RuntimeCollection,
	RuntimeEntry,
	RuntimeEvent,
} from '@franklin/extensions';
import type { FranklinRuntime, FranklinState } from '../types.js';

export type AgentCreateInput = OrchestratorCreateInput<FranklinState>;
export type AgentCreate = (
	input?: AgentCreateInput,
) => Promise<RuntimeEntry<FranklinRuntime>>;

export type Agents = {
	create: AgentCreate;
	get(id: string): RuntimeEntry<FranklinRuntime> | undefined;
	list(): RuntimeEntry<FranklinRuntime>[];
	remove(id: string): Promise<boolean>;
	subscribe(
		listener: (event: RuntimeEvent<FranklinRuntime>) => void,
	): () => void;
};

export function createAgents(
	create: AgentCreate,
	collection: RuntimeCollection<FranklinRuntime>,
): Agents {
	return {
		create,
		get: (id) => collection.get(id),
		list: () => collection.list(),
		remove: (id) => collection.remove(id),
		subscribe: (listener) => collection.subscribe(listener),
	};
}
