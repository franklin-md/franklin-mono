import { Prompt, useConversationTurns } from '@franklin/react';

import { PromptInput } from './input/prompt-input.js';
import { ConversationView } from './view/conversation-view.js';

export function ConversationPanel() {
	const turns = useConversationTurns();

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<ConversationView turns={turns.get()} />
			<Prompt>
				<PromptInput />
			</Prompt>
		</div>
	);
}
