import type { ConversationRenderTurn } from '@franklin/react';

import { ForkButton } from '../../agent-selector/fork-button.js';

export function TurnFooter({ turn }: { turn: ConversationRenderTurn }) {
	if (!turn.isLast) return null;
	return <ForkButton />;
}
