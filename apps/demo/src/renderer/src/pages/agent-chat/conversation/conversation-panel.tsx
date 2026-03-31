import { useConversation } from './conversation-context.js';
import { ConversationView } from './view/conversation-view.js';
import { PromptInput } from './input/prompt-input.js';

export function ConversationPanel() {
	const { turns, onSend, sending } = useConversation();

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<ConversationView turns={turns} />
			<PromptInput onSend={onSend} sending={sending} />
		</div>
	);
}
