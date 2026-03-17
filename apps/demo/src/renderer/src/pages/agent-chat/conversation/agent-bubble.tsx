import type { AgentTextEntry } from '@franklin/agent/browser';

export function AgentBubble({ entry }: { entry: AgentTextEntry }) {
	const text = entry.content
		.filter((b): b is { type: 'text'; text: string } => b.type === 'text')
		.map((b) => b.text)
		.join('');

	return (
		<div className="flex justify-start">
			<div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
				{text}
			</div>
		</div>
	);
}
