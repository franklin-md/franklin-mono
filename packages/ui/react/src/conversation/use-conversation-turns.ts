import {
	conversationExtension,
	type ConversationTurn,
	type Store,
} from '@franklin/extensions';

import { useAgent } from '../agent/agent-context.js';
import { useStore } from '../utils/use-store.js';
import { useThrottledStoreValue } from '../utils/use-throttled-store-value.js';

function useConversationStore(): Store<ConversationTurn[]> {
	const agent = useAgent();
	return agent.getStore(conversationExtension.keys.conversation);
}

/**
 * Returns the active agent's conversation turns.
 *
 * Must be used inside an `<AgentProvider>`.
 */
export function useConversationTurns(): ConversationTurn[] {
	return useStore(useConversationStore()).get();
}

/**
 * Returns the active agent's conversation turns at a throttled update cadence.
 *
 * Must be used inside an `<AgentProvider>`.
 */
export function useThrottledConversationTurns(): ConversationTurn[] {
	return useThrottledStoreValue(useConversationStore(), { throttleMs: 16 });
}
