import { conversationTitleExtension } from '@franklin/agent/mobile';

import { useAgentState } from '../agent/use-agent-state.js';

/**
 * Returns the active agent's current conversation title.
 *
 * Must be used inside an `<AgentProvider>`.
 */
export function useConversationTitle(): string {
	return useAgentState(conversationTitleExtension.keys.title).get();
}
