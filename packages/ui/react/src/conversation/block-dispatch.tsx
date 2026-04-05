import type { AssistantBlock } from '@franklin/extensions';

import type { BlockComponents } from './types.js';
import { computeToolStatus } from './status.js';

export function BlockDispatch({
	block,
	components,
}: {
	block: AssistantBlock;
	components: BlockComponents;
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
			return null;
	}
}
