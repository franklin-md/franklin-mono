import type { UserMessage } from '@franklin/mini-acp';

import { referenceMentionMarkdown } from '../reference-mention/markdown.js';
import { Markdown, type MarkdownProps } from './markdown.js';

interface Props {
	message: UserMessage;
	markdown?: Omit<MarkdownProps, 'text'>;
}

export function UserBubble({ message, markdown }: Props) {
	const text = message.content
		.filter((b): b is { type: 'text'; text: string } => b.type === 'text')
		.map((b) => b.text)
		.join('');

	return (
		<div className="min-w-0 break-words rounded-lg bg-muted px-3 py-2 text-sm ring-1 ring-inset ring-ring">
			<Markdown
				text={text}
				{...referenceMentionMarkdown}
				{...markdown}
				remarkPlugins={[
					...(referenceMentionMarkdown.remarkPlugins ?? []),
					...(markdown?.remarkPlugins ?? []),
				]}
				customElements={{
					...referenceMentionMarkdown.customElements,
					...markdown?.customElements,
				}}
			/>
		</div>
	);
}
