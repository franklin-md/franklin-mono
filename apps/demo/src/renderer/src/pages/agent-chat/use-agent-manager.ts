import { useCallback, useRef } from 'react';

import {
	conversationExtension,
	createAgent,
	todoExtension,
} from '@franklin/agent/browser';
import type { Agent } from '@franklin/agent/browser';
import { ElectronAuthStore, ElectronFramework } from '@franklin/electron/renderer';

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

	return useCallback(
		(): GroupSpawnPoint => {
		const framework = frameworkRef.current;
		if (!framework) {
			throw new Error('ElectronFramework not initialized');
		}

		return async (): Promise<SpawnResult> => {
			const authBridge = window.__franklinBridge.auth;
			if (!authBridge) throw new Error('Auth bridge not available');
			const authStore = new ElectronAuthStore(authBridge);
			await authStore.initialize();
			const apiKey = await authStore.getApiKey('anthropic');
			const transport = await framework.spawn();
			const agent = await createAgent(extensions, transport);
			await agent.setContext({
				ctx: {
					config: { provider: 'anthropic', model: 'claude-opus-4-6', ...(apiKey !== undefined && { apiKey }) },
					tools: [],
					history: { systemPrompt: '', messages: [] },
				},
			});

			console.log('[spawn] done');
			return { agent };
		};
	}, []);
}
