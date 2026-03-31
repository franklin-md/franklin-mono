import type { UserMessage } from '@franklin/mini-acp';

export function UserBubble({ message }: { message: UserMessage }) {
	const text = message.content
		.filter((b): b is { type: 'text'; text: string } => b.type === 'text')
		.map((b) => b.text)
		.join('');

	return (
		<div className="flex justify-end">
			<div className="max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
				{text}
			</div>
		</div>
	);
}
