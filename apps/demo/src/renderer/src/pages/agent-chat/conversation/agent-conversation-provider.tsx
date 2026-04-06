import { useCallback, useState, type ReactNode } from 'react';

import { conversationExtension } from '@franklin/extensions';
import { useAgent, useAgentState } from '@franklin/react';

import { ConversationProvider } from './conversation-context.js';

/**
 * Bridges the agent layer to the conversation UI. Reads conversation state
 * from the agent's store and exposes a simplified send interface.
 *
 * Sits between `<AgentProvider>` and the conversation components so that
 * the conversation UI itself has no direct dependency on the agent layer.
 */
export function AgentConversationProvider({
	children,
}: {
	children: ReactNode;
}) {
	const agent = useAgent();
	const conversation = useAgentState(conversationExtension.keys.conversation);
	const [sending, setSending] = useState(false);

	const onSend = useCallback(
		async (text: string) => {
			setSending(true);
			try {
				const stream = agent.prompt({
					role: 'user',
					content: [{ type: 'text', text }],
				});
				// Drain — events handled by conversation extension via observers
				for await (const _event of stream) {
					/* noop */
				}
			} finally {
				setSending(false);
			}
		},
		[agent],
	);

	return (
		<ConversationProvider
			value={{ turns: conversation.get(), onSend, sending }}
		>
			{children}
		</ConversationProvider>
	);
}
