import { conversationKey } from '@franklin/agent/browser';
import { useAgent, useAgentState } from '@franklin/react';

import { ConversationView } from './conversation-view.js';
import { PromptInput } from './prompt-input.js';

export function ConversationPanel() {
	const agent = useAgent();
	const conversation = useAgentState(conversationKey);

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<ConversationView turns={conversation.get()} />
			<PromptInput commands={agent} />
		</div>
	);
}
