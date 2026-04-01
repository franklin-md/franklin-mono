import type { UserMessage } from '@franklin/mini-acp';

export function UserBubble({ prompt }: { prompt: UserMessage }) {
	const text = prompt.content
		.filter((b): b is { type: 'text'; text: string } => b.type === 'text')
		.map((b) => b.text)
		.join('');

	return (
		<div className="rounded-lg bg-muted px-3 py-2 text-sm ring-1 ring-inset ring-ring">
			{text}
		</div>
	);
}
