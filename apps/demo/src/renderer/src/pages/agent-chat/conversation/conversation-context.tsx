import type { ConversationTurn } from '@franklin/extensions';
import { createSimpleContext } from '@franklin/react';

export interface ConversationContextValue {
	turns: ConversationTurn[];
	onSend: (text: string) => Promise<void>;
	sending: boolean;
}

export const [ConversationProvider, useConversation] =
	createSimpleContext<ConversationContextValue>('Conversation');
