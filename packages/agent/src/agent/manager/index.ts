import type { ClientProtocol } from '@franklin/mini-acp';
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

	async spawn(transport: ClientProtocol): Promise<ManagedAgent> {
		return this.initAgent(transport);
	}

	async child(
		agentId: string,
		transport: ClientProtocol,
	): Promise<ManagedAgent> {
		const entry = this.getEntry(agentId);
		const existingStores = entry.agent.stores.copy('private');
		return this.initAgent(transport, existingStores);
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
		transport: ClientProtocol,
		existingStores?: StoreResult,
	): Promise<ManagedAgent> {
		const agentId = crypto.randomUUID();
		const extensions = this.extFactory();
		const agent = await createAgent(extensions, transport, existingStores);
		this.agents.set(agentId, { agentId, agent });
		return { agentId, agent };
	}
}
