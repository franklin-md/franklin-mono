import type { ConversationTurn } from '@franklin/agent/browser';
import { useAgent, useAgentState } from '@franklin/react';

import { ConversationView } from './conversation-view.js';
import { PromptInput } from './prompt-input.js';

export function ConversationPanel() {
	const agent = useAgent();
	const turns = useAgentState(agent, 'conversation') as ConversationTurn[];

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<ConversationView turns={turns} />
			<PromptInput commands={agent} />
		</div>
	);
}
