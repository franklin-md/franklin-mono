import { useMemo } from 'react';

import type { ConversationRenderTurn } from '@franklin/react';

import { getAssistantText } from '../copy-button.js';

export interface TurnFooterActionsState {
	assistantText: string;
	hasActions: boolean;
	hasCopy: boolean;
	hasFork: boolean;
}

export function useTurnFooterActions(
	turn: ConversationRenderTurn,
): TurnFooterActionsState {
	const assistantText = useMemo(() => getAssistantText(turn), [turn]);
	const hasCopy = assistantText.length > 0;
	const hasFork = turn.isLast;

	return {
		assistantText,
		hasActions: hasCopy || hasFork,
		hasCopy,
		hasFork,
	};
}
