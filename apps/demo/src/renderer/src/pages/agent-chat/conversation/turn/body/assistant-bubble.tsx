import type { AssistantContent, AssistantMessage } from '@franklin/mini-acp';

import { TextBlock } from './blocks/text-block.js';
import { ThinkingBlock } from './blocks/thinking-block.js';
import { ToolCallBlock } from './blocks/tool-call-block.js';

/**
 * Groups adjacent content blocks by type so that consecutive text/thinking
 * chunks render as a single block instead of one per chunk.
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
						return <TextBlock key={i} text={group.text} />;
					case 'toolCall':
						return <ToolCallBlock key={i} name={group.name} />;
					case 'thinking':
						return <ThinkingBlock key={i} text={group.text} />;
					case 'image':
						return null;
				}
			})}
		</div>
	);
}
