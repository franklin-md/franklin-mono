import type { ConversationRenderTurn } from '@franklin/react';
import { UserBubble } from '@franklin/ui';

import { obsidianMarkdown } from './markdown.js';

interface Props {
	turn: ConversationRenderTurn;
}

export function ObsidianUserMessage({ turn }: Props) {
	return <UserBubble message={turn.prompt} markdown={obsidianMarkdown} />;
}
