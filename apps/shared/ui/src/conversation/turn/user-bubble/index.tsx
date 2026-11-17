import type { UserMessage } from '@franklin/mini-acp';

import type { MarkdownProps } from '../markdown.js';
import { ExpandableBubble } from './expandable.js';

interface UserBubbleProps {
	message: UserMessage;
	markdown?: Omit<MarkdownProps, 'text'>;
}

export function UserBubble({ message, markdown }: UserBubbleProps) {
	const text = message.content
		.filter((b): b is { type: 'text'; text: string } => b.type === 'text')
		.map((b) => b.text)
		.join('');

	return <ExpandableBubble text={text} markdown={markdown} />;
}
