import {
	conversationExtension,
	type ConversationTurn,
} from '@franklin/extensions';

import { useAgent } from '../agent/agent-context.js';
import { useThrottledStoreValue } from '../utils/use-throttled-store-value.js';

/**
 * Returns a reactive store of the active agent's conversation turns.
 *
 * Must be used inside an `<AgentProvider>`.
 */
export function useConversationTurns(): ConversationTurn[] {
	const agent = useAgent();
	const store = agent.getStore(conversationExtension.keys.conversation);
	return useThrottledStoreValue(store, { throttleMs: 16 });
}
