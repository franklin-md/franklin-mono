import { useAgent, useAgentState } from '@franklin/react';

import { ConversationView } from './conversation-view.js';
import { PromptInput } from './prompt-input.js';
import type { DemoExtensions } from '../use-agent-manager.js';

export function ConversationPanel({ sessionId }: { sessionId: string }) {
	const agent = useAgent<DemoExtensions>();
	const turns = useAgentState(agent, 'conversation');

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<ConversationView turns={turns} />
			<PromptInput commands={agent} sessionId={sessionId} />
		</div>
	);
}
