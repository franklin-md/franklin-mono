import type { AssistantTurn } from '@franklin/extensions';

import { TextBlock } from './blocks/text/text.js';
import { ThinkingBlock } from './blocks/thinking.js';
import { ToolCallBlock } from './blocks/tool-call.js';

export function AssistantBubble({ response }: { response: AssistantTurn }) {
	return (
		<div className="flex flex-col gap-1.5">
			{response.blocks.map((block, i) => {
				switch (block.kind) {
					case 'text':
						return <TextBlock key={i} text={block.text} />;
					case 'thinking':
						return <ThinkingBlock key={i} text={block.text} />;
					case 'toolUse':
						return <ToolCallBlock key={i} name={block.call.name} />;
					case 'turnEnd':
						return null;
				}
			})}
		</div>
	);
}
