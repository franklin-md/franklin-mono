import { useConversation } from './conversation-context.js';
import { ConversationView } from './conversation-view.js';
import { PromptInput } from './prompt-input.js';

export function ConversationPanel() {
	const { turns, onSend, sending } = useConversation();

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<ConversationView turns={turns} />
			<PromptInput onSend={onSend} sending={sending} />
		</div>
	);
}
