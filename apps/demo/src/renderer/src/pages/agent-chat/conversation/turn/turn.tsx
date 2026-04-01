import type { ConversationTurn } from '@franklin/extensions';

import { UserBubble } from './body/user-bubble.js';
import { AssistantBubble } from './body/assistant-bubble.js';

export function Turn({ turn }: { turn: ConversationTurn }) {
	return (
		<div className="flex flex-col gap-4">
			<UserBubble prompt={turn.prompt} />
			<AssistantBubble response={turn.response} />
		</div>
	);
}
