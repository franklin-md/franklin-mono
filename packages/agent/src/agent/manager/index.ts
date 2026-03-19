import type {
	ExtensionFactory,
	ExtensionList,
} from '../../extensions/types/extension.js';
import type { AgentTransport } from '../../transport/index.js';
import type { Agent } from '../types.js';
import type { McpTransportFactory } from '../../extensions/compile/start.js';
import { createAgent } from '../create.js';

export type ManagedAgent<E extends ExtensionList> = {
	agentId: string;
	agent: Agent<E>;
};

type AgentEntry<E extends ExtensionList> = {
	agentId: string;
	extensions: E;
	agent: Agent<E>;
};

export class AgentManager<E extends ExtensionList> {
	private agents: Map<string, AgentEntry<E>> = new Map();

	constructor(
		private readonly extFactory: ExtensionFactory<E>,
		private readonly toolTransport: McpTransportFactory,
	) {}

	async spawn(transport: AgentTransport): Promise<ManagedAgent<E>> {
		return await this.initAgent(this.extFactory(), transport);
	}

	async child(
		agentId: string,
		transport: AgentTransport,
	): Promise<ManagedAgent<E>> {
		const entry = this.getEntry(agentId);

		const extWithCopiedStore = entry.extensions.map((ext) => {
			const proto = Object.getPrototypeOf(ext) as object;
			return Object.assign(Object.create(proto), ext, {
				state: ext.state?.copy(),
			});
		}) as E;

		// Use the same extensions as the parent agent but with copied stores.
		// Rely on the store's copy semantics to dictate sharing semantics.
		return await this.initAgent(extWithCopiedStore, transport);
	}

	get(agentId: string): Agent<E> {
		return this.getEntry(agentId).agent;
	}

	private getEntry(agentId: string): AgentEntry<E> {
		const entry = this.agents.get(agentId);
		if (!entry) {
			throw new Error(`Agent ${agentId} not found`);
		}
		return entry;
	}

	private async initAgent(
		extensions: E,
		transport: AgentTransport,
	): Promise<ManagedAgent<E>> {
		const agentId = crypto.randomUUID();
		const agent = await createAgent(extensions, transport, this.toolTransport);
		this.agents.set(agentId, { agentId, extensions, agent });
		return { agentId, agent };
	}
}
