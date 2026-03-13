import { useMemo } from 'react';

import type { AgentSessionSnapshot } from '@franklin/react-agents/browser';
import type { ConversationState } from '@/lib/conversation';
import { buildConversationState } from '@/lib/conversation';

/**
 * Derives a structured ConversationState from a raw AgentSessionSnapshot.
 * Recomputes only when the transcript reference changes.
 */
export function useConversation(
	snapshot: AgentSessionSnapshot,
): ConversationState {
	return useMemo(
		() => buildConversationState(snapshot.transcript),
		[snapshot.transcript],
	);
}
