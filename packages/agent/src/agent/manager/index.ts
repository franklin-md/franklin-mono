import type { MiniACPClient } from '@franklin/mini-acp';
import type {
	Extension,
	CoreAPI,
	StoreAPI,
	StoreResult,
} from '@franklin/extensions';
import type { Agent } from '../types.js';
import { createAgent } from '../create.js';

export type ManagedAgent = {
	agentId: string;
	agent: Agent;
};

type AgentEntry = {
	agentId: string;
	agent: Agent;
};

export class AgentManager {
	private agents: Map<string, AgentEntry> = new Map();

	constructor(
		private readonly extFactory: () => Extension<CoreAPI & StoreAPI>[],
	) {}

	async spawn(client: MiniACPClient): Promise<ManagedAgent> {
		return this.initAgent(client);
	}

	async child(agentId: string, client: MiniACPClient): Promise<ManagedAgent> {
		const entry = this.getEntry(agentId);
		const existingStores = entry.agent.stores.copy('private');
		return this.initAgent(client, existingStores);
	}

	get(agentId: string): Agent {
		return this.getEntry(agentId).agent;
	}

	private getEntry(agentId: string): AgentEntry {
		const entry = this.agents.get(agentId);
		if (!entry) {
			throw new Error(`Agent ${agentId} not found`);
		}
		return entry;
	}

	private async initAgent(
		client: MiniACPClient,
		existingStores?: StoreResult,
	): Promise<ManagedAgent> {
		const agentId = crypto.randomUUID();
		const extensions = this.extFactory();
		const agent = await createAgent(extensions, client, existingStores);
		this.agents.set(agentId, { agentId, agent });
		return { agentId, agent };
	}
}
