import type { AssistantBlock } from '@franklin/extensions';

import type { ConversationComponents } from './types.js';
import { computeToolStatus } from './tools/status.js';

export function BlockDispatch({
	block,
	components,
}: {
	block: AssistantBlock;
	components: ConversationComponents;
}) {
	switch (block.kind) {
		case 'text':
			return <components.Text text={block.text} />;
		case 'thinking':
			return <components.Thinking text={block.text} />;
		case 'toolUse':
			return (
				<components.ToolUse block={block} status={computeToolStatus(block)} />
			);
		case 'turnEnd':
			return components.TurnEnd ? <components.TurnEnd block={block} /> : null;
	}
}
