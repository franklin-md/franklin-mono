import { useCallback, useRef } from 'react';

import {
	conversationExtension,
	createAgent,
	todoExtension,
} from '@franklin/agent/browser';
import type { Agent } from '@franklin/agent/browser';
import { ElectronFramework } from '@franklin/electron/renderer';

export interface SpawnResult {
	agent: Agent;
}

const extensions = [conversationExtension(), todoExtension()];

export type GroupSpawnPoint = () => Promise<SpawnResult>;
export type GroupFactory = () => GroupSpawnPoint;

export function useAgentManager(): GroupFactory {
	const frameworkRef = useRef<ElectronFramework | null>(null);
	if (!frameworkRef.current) {
		frameworkRef.current = new ElectronFramework();
	}

	return useCallback((): GroupSpawnPoint => {
		const framework = frameworkRef.current;
		if (!framework) {
			throw new Error('ElectronFramework not initialized');
		}

		return async (): Promise<SpawnResult> => {
			const transport = await framework.spawn();
			const agent = await createAgent(extensions, transport);
			await agent.setContext({
				ctx: { tools: [], history: { systemPrompt: '', messages: [] } },
			});
			return { agent };
		};
	}, []);
}
