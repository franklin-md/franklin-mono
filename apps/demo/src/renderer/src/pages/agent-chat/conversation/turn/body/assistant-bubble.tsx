import type { AssistantContent, AssistantMessage } from '@franklin/mini-acp';

import { Card } from '@/components/ui/card';

/**
 * Groups adjacent content blocks by type so that consecutive text/thinking
 * chunks render as a single bubble instead of one bubble per chunk.
 */
type Group =
	| { kind: 'text'; text: string }
	| { kind: 'thinking'; text: string }
	| { kind: 'toolCall'; name: string }
	| { kind: 'image' };

function groupContent(content: AssistantContent[]): Group[] {
	const groups: Group[] = [];
	for (const block of content) {
		switch (block.type) {
			case 'text': {
				const prev = groups[groups.length - 1];
				if (prev && prev.kind === 'text') {
					prev.text += block.text;
				} else {
					groups.push({ kind: 'text', text: block.text });
				}
				break;
			}
			case 'thinking': {
				const prev = groups[groups.length - 1];
				if (prev && prev.kind === 'thinking') {
					prev.text += block.text;
				} else {
					groups.push({ kind: 'thinking', text: block.text });
				}
				break;
			}
			case 'toolCall':
				groups.push({ kind: 'toolCall', name: block.name });
				break;
			case 'image':
				groups.push({ kind: 'image' });
				break;
		}
	}
	return groups;
}

export function AssistantBubble({ message }: { message: AssistantMessage }) {
	const groups = groupContent(message.content);

	return (
		<div className="flex flex-col gap-1.5">
			{groups.map((group, i) => {
				switch (group.kind) {
					case 'text':
						return (
							<div key={i} className="flex justify-start">
								<div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
									{group.text}
								</div>
							</div>
						);
					case 'toolCall':
						return (
							<div key={i} className="flex justify-start">
								<Card className="flex-row items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground shadow-none">
									<span>{group.name}</span>
								</Card>
							</div>
						);
					case 'thinking':
						return (
							<div key={i} className="flex justify-start">
								<div className="max-w-[80%] rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground/60 italic whitespace-pre-wrap">
									{group.text}
								</div>
							</div>
						);
					case 'image':
						return null;
				}
			})}
		</div>
	);
}
