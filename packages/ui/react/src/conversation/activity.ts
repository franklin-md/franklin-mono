import type { ReactNode } from 'react';
import type { AssistantBlock } from '@franklin/agent';

import type { ConversationRenderTurn } from './turn-info/types.js';

export type ConversationActivityProps = {
	turn: ConversationRenderTurn;
	blocks: AssistantBlock[];
	children: ReactNode;
};

export function createActivityFilter(blocks: AssistantBlock[]) {
	// The protocol does not label commentary separately from the answer. Text
	// before the last tool/thinking block belongs to activity; trailing text stays
	// visible as it streams, and moves into activity if another action follows.
	const activityEnd = blocks.findLastIndex(
		(block) => block.kind === 'toolUse' || block.kind === 'thinking',
	);
	return (index: number) => index <= activityEnd;
}
