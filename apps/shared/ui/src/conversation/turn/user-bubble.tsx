import type { UserMessage } from '@franklin/mini-acp';

import { referenceMentionMarkdown } from '../reference-mention/markdown.js';
import { Markdown } from './markdown.js';

export function UserBubble({ message }: { message: UserMessage }) {
	const text = message.content
		.filter((b): b is { type: 'text'; text: string } => b.type === 'text')
		.map((b) => b.text)
		.join('');

	return (
		<div className="min-w-0 break-words rounded-lg bg-muted px-3 py-2 text-sm ring-1 ring-inset ring-ring">
			<Markdown
				text={text}
				className="prose-content"
				{...referenceMentionMarkdown}
			/>
		</div>
	);
}
