import type {
	AgentId,
	AgentMetadata,
	AgentStore,
	HistoryEntry,
} from './types.js';

/**
 * In-memory implementation of AgentStore.
 * Useful for testing and as the default when no persistent store is provided.
 */
export class InMemoryAgentStore implements AgentStore {
	private metadata = new Map<AgentId, AgentMetadata>();
	private history = new Map<AgentId, HistoryEntry[]>();

	async saveMetadata(metadata: AgentMetadata): Promise<void> {
		this.metadata.set(metadata.agentId, metadata);
	}

	async loadMetadata(agentId: AgentId): Promise<AgentMetadata | undefined> {
		return this.metadata.get(agentId);
	}

	async listMetadata(): Promise<AgentMetadata[]> {
		return [...this.metadata.values()];
	}

	async remove(agentId: AgentId): Promise<void> {
		this.metadata.delete(agentId);
		this.history.delete(agentId);
	}

	async appendEntry(agentId: AgentId, entry: HistoryEntry): Promise<void> {
		let entries = this.history.get(agentId);
		if (!entries) {
			entries = [];
			this.history.set(agentId, entries);
		}
		entries.push(entry);
	}

	async loadHistory(agentId: AgentId): Promise<HistoryEntry[]> {
		return [...(this.history.get(agentId) ?? [])];
	}
}
