import type { AgentRegistry } from '@franklin/agent';
import { spawn } from '@franklin/react-agents';

import { TuiSession } from './tui-session.js';

export class TuiAgentManager {
	private readonly _registry: AgentRegistry;
	private readonly _sessions = new Map<string, TuiSession>();
	private readonly _listeners = new Set<() => void>();

	constructor(registry: AgentRegistry) {
		this._registry = registry;
	}

	async spawn(agentId: string, cwd: string): Promise<TuiSession> {
		const session = new TuiSession(
			agentId,
			await spawn(this._registry, {
				agent: 'codex',
				cwd,
			}),
			() => this._emit(),
		);
		this._sessions.set(agentId, session);
		this._emit();
		return session;
	}

	get(agentId: string): TuiSession | undefined {
		return this._sessions.get(agentId);
	}

	list(): TuiSession[] {
		return [...this._sessions.values()];
	}

	subscribe(listener: () => void): () => void {
		this._listeners.add(listener);
		return () => {
			this._listeners.delete(listener);
		};
	}

	async disposeAll(): Promise<void> {
		await Promise.all(
			[...this._sessions.values()].map((session) => session.dispose()),
		);
		this._sessions.clear();
		this._emit();
	}

	private _emit(): void {
		for (const listener of this._listeners) {
			listener();
		}
	}
}
