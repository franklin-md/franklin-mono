import {
	createAgentConnection,
	type AgentCommands,
	type AgentConnection,
	type AgentEvents,
} from '../browser.js';
import type { AgentTransport } from '../transport/index.js';

export class AgentManager {
	private lastId = -1;
	private readonly agents: Map<number, AgentConnection> = new Map();

	// Creates a new Agent and returns id
	public async createAgent(
		transport: AgentTransport,
		handler: AgentEvents,
	): Promise<AgentCommands> {
		const connection = createAgentConnection(transport, handler);
		const id = this.nextId();
		this.agents.set(id, connection);
		return connection.commands;
	}

	public async close(): Promise<void> {
		for (const connection of this.agents.values()) {
			await connection.dispose();
		}
		this.agents.clear();
	}

	private nextId(): number {
		return this.lastId++;
	}
}
