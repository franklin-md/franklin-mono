import type { AgentCommands } from '@franklin/agent';
import type { LLMConfig } from '@franklin/mini-acp';

import type { AuthStore } from './store.js';

// ---------------------------------------------------------------------------
// Agent configuration
// ---------------------------------------------------------------------------

/**
 * Resolves the API key for `config.provider` from the auth store (refreshing
 * OAuth tokens if needed) and applies the resulting `LLMConfig` to the agent
 * via `setContext`.
 *
 * Call this before initiating a prompt turn to ensure the agent has up-to-date
 * authentication.
 *
 * @example
 * ```ts
 * const store = new AuthStore();
 * await loginOAuth('anthropic', store, callbacks);
 *
 * const agent = ...; // Agent
 * await configureAgent(agent, store, { provider: 'anthropic', model: 'claude-opus-4-6' });
 * await agent.prompt({ message: ... });
 * ```
 */
export async function configureAgent(
	agent: AgentCommands,
	store: AuthStore,
	config: {
		provider: string;
		model?: string;
	},
): Promise<void> {
	const apiKey = await store.getApiKey(config.provider);

	const llmConfig: LLMConfig = {
		provider: config.provider,
		...(config.model !== undefined && { model: config.model }),
		...(apiKey !== undefined && { apiKey }),
	};

	await agent.setContext({ ctx: { config: llmConfig } });
}
