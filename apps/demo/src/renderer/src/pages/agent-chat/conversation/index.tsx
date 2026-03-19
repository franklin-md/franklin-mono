import type { AgentCommands } from '@franklin/agent/browser';
import type { ConversationExtension } from '@franklin/agent/browser';
import { useStore } from '@franklin/react';

import { ConversationView } from './conversation-view.js';
import { PromptInput } from './prompt-input.js';

export function ConversationPanel({
	conversationExt,
	commands,
	sessionId,
}: {
	conversationExt: ConversationExtension;
	commands: AgentCommands;
	sessionId: string;
}) {
	const { get: turns } = useStore(conversationExt.state);

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<ConversationView turns={turns()} />
			<PromptInput commands={commands} sessionId={sessionId} />
		</div>
	);
}
