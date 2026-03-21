import { useCallback, useRef } from 'react';

import {
	AgentManager,
	ConversationExtension,
	TodoExtension,
	PROTOCOL_VERSION,
	createSharedStore,
} from '@franklin/agent/browser';
import type { Agent, Todo } from '@franklin/agent/browser';
import { ElectronFramework } from '@franklin/electron/renderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DemoExtensions = [ConversationExtension, TodoExtension];

export interface SpawnResult {
	agent: Agent<DemoExtensions>;
	sessionId: string;
}

/** Spawns an agent within a group. Each call creates a new agent. */
export type GroupSpawnPoint = () => Promise<SpawnResult>;

/** Creates a new group — each group gets its own AgentManager. */
export type GroupFactory = () => GroupSpawnPoint;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Provides a factory for creating agent groups. Each group gets its own
 * `AgentManager` with ConversationExtension + TodoExtension. Within a
 * group, agents share extension copy-semantics (private stores by default).
 */
export function useAgentManager(): GroupFactory {
	// Lazy ref init — ElectronFramework constructor is cheap but avoid
	// recreating on every render.
	const frameworkRef = useRef<ElectronFramework | null>(null);
	if (!frameworkRef.current) {
		frameworkRef.current = new ElectronFramework();
	}

	// Each call to the factory creates a new AgentManager (one per group).
	// The returned spawn point uses that manager to spawn agents.
	return useCallback((): GroupSpawnPoint => {
		const framework = frameworkRef.current;
		if (!framework) {
			throw new Error('ElectronFramework not initialized');
		}

		const todos = createSharedStore<Todo[]>([]);

		const manager = new AgentManager<DemoExtensions>(
			() => [new ConversationExtension(), new TodoExtension(todos)],
			framework.toolTransport,
		);

		return async (): Promise<SpawnResult> => {
			const env = await framework.provision();
			const transport = await env.spawn('claude-acp');
			const { agent } = await manager.spawn(transport);

			await agent.initialize({
				clientInfo: { name: 'franklin-demo', version: '0.1.0' },
				protocolVersion: PROTOCOL_VERSION,
			});
			const { sessionId } = await agent.newSession({
				cwd: '/tmp',
				mcpServers: [],
			});

			return { agent, sessionId };
		};
	}, []);
}
