import type { UserMessage } from '@franklin/mini-acp';

import { ExpandableBubble } from './expandable.js';

interface UserBubbleProps {
	message: UserMessage;
}

export function UserBubble({ message }: UserBubbleProps) {
	const text = message.content
		.filter((b): b is { type: 'text'; text: string } => b.type === 'text')
		.map((b) => b.text)
		.join('');

	return <ExpandableBubble text={text} />;
}
