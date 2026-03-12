import { MockAdapter, MockedAgent } from '@franklin/managed-agent/testing';

import { AgentManager } from '../agent-manager.js';
import type { AgentId, AgentMetadata, AgentStore } from '../types.js';

export interface CreateMockAgentManagerOptions {
	store?: AgentStore;
	createMockedAgent?: (options: {
		agentId: AgentId;
		metadata: AgentMetadata;
	}) => MockedAgent;
}

export class MockAgentRegistry {
	private readonly agents = new Map<AgentId, MockedAgent>();
	private readonly createMockedAgent:
		| ((options: { agentId: AgentId; metadata: AgentMetadata }) => MockedAgent)
		| undefined;

	constructor(
		createMockedAgent?: CreateMockAgentManagerOptions['createMockedAgent'],
	) {
		this.createMockedAgent = createMockedAgent;
	}

	ensure(agentId: AgentId, metadata: AgentMetadata): MockedAgent {
		const existing = this.agents.get(agentId);
		if (existing) return existing;

		const agent =
			this.createMockedAgent?.({ agentId, metadata }) ??
			new MockedAgent(agentId);
		this.agents.set(agentId, agent);
		return agent;
	}

	peek(agentId: AgentId): MockedAgent | undefined {
		return this.agents.get(agentId);
	}

	get(agentId: AgentId): MockedAgent {
		const agent = this.peek(agentId);
		if (!agent) {
			throw new Error(`No mock agent found for id "${agentId}"`);
		}
		return agent;
	}

	list(): MockedAgent[] {
		return [...this.agents.values()];
	}
}

export function createMockAgentManager(
	options: CreateMockAgentManagerOptions = {},
): {
	manager: AgentManager;
	mocks: MockAgentRegistry;
} {
	const mocks = new MockAgentRegistry(options.createMockedAgent);

	const manager = new AgentManager({
		store: options.store,
		adapterFactory: (adapterKind, factoryOptions) => {
			if (adapterKind !== 'mock') {
				throw new Error(
					`createMockAgentManager only supports adapter kind "mock" (got "${adapterKind}")`,
				);
			}

			return new MockAdapter(
				factoryOptions,
				mocks.ensure(factoryOptions.agentId, factoryOptions.metadata),
			);
		},
	});

	return { manager, mocks };
}
