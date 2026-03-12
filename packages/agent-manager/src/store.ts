import type { ManagedAgentEvent } from '@franklin/managed-agent';

import type { AgentId, AgentMetadata, AgentStore } from './types.js';

/**
 * In-memory implementation of AgentStore.
 * Useful for testing and as the default when no persistent store is provided.
 */
export class InMemoryAgentStore implements AgentStore {
	private metadata = new Map<AgentId, AgentMetadata>();
	private events = new Map<AgentId, ManagedAgentEvent[]>();

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
		this.events.delete(agentId);
	}

	async appendEvent(agentId: AgentId, event: ManagedAgentEvent): Promise<void> {
		let entries = this.events.get(agentId);
		if (!entries) {
			entries = [];
			this.events.set(agentId, entries);
		}
		entries.push(event);
	}

	async loadEvents(agentId: AgentId): Promise<ManagedAgentEvent[]> {
		return [...(this.events.get(agentId) ?? [])];
	}
}
