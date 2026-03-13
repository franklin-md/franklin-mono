import { spawn, type AgentRegistry } from '@franklin/agent';

import { AgentStore } from './agent-store.js';

export class TuiAgentManager {
	private readonly _registry: AgentRegistry;
	private readonly _stores = new Map<string, AgentStore>();
	private readonly _listeners = new Set<() => void>();

	constructor(registry: AgentRegistry) {
		this._registry = registry;
	}

	async spawn(agentId: string, cwd: string): Promise<AgentStore> {
		const store = new AgentStore(agentId);
		this._stores.set(agentId, store);
		this._emit();

		const result = await spawn(this._registry, {
			agent: 'codex',
			cwd,
			handler: {
				sessionUpdate: async (params) => {
					store._handleSessionUpdate(params);
				},
				requestPermission: (params) => {
					return store._handleRequestPermission(params);
				},
			},
		});

		store._init(result.stack, result.sessionId, result.connection);
		return store;
	}

	get(agentId: string): AgentStore | undefined {
		return this._stores.get(agentId);
	}

	list(): AgentStore[] {
		return [...this._stores.values()];
	}

	subscribe(listener: () => void): () => void {
		this._listeners.add(listener);
		return () => {
			this._listeners.delete(listener);
		};
	}

	async disposeAll(): Promise<void> {
		await Promise.all([...this._stores.values()].map((s) => s.dispose()));
		this._stores.clear();
		this._emit();
	}

	private _emit(): void {
		for (const listener of this._listeners) {
			listener();
		}
	}
}
