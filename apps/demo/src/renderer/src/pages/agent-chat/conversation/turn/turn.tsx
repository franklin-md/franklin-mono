import type { ConversationTurn } from '@franklin/extensions';

import { UserBubble } from './body/user-bubble.js';
import { AssistantBubble } from './body/assistant-bubble.js';

export function Turn({ turn }: { turn: ConversationTurn }) {
	return (
		<div className="flex flex-col gap-4">
			{turn.messages.map((message, i) => {
				switch (message.role) {
					case 'user':
						return <UserBubble key={i} message={message} />;
					case 'assistant':
						return <AssistantBubble key={i} message={message} />;
					case 'toolResult':
						return null;
				}
			})}
		</div>
	);
}
