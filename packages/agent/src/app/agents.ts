import type {
	Orchestrator,
	OrchestratorCreateInput,
	RuntimeEntry,
} from '../modules/orchestrator/index.js';
import type { FranklinBase, FranklinRuntime, FranklinState } from '../types.js';

export type AgentCreateInput = OrchestratorCreateInput<FranklinState>;
export type AgentCreate = (
	input?: AgentCreateInput,
) => Promise<RuntimeEntry<FranklinRuntime>>;

export type Agents = Orchestrator<FranklinBase>;
