import type { ConversationTurn, Store } from '@franklin/extensions';
import { conversationExtension } from '@franklin/extensions';

import { useAgentState } from './use-agent-state.js';

/**
 * Returns a reactive store of the active agent's conversation turns.
 *
 * Must be used inside an `<AgentProvider>`.
 */
export function useConversationTurns(): Store<ConversationTurn[]> {
	return useAgentState(conversationExtension.keys.conversation);
}
