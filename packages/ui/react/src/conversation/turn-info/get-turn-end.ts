import type { ConversationTurn, TurnEndBlock } from '@franklin/extensions';

export function getConversationTurnEnd(
	turn: ConversationTurn,
): TurnEndBlock | undefined {
	const last = turn.response.blocks.at(-1);
	return last?.kind === 'turnEnd' ? last : undefined;
}
