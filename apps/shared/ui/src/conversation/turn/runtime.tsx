import { formatElapsed } from '@franklin/lib';
import type { ConversationRenderTurn } from '@franklin/react';

export function TurnRuntime({ turn }: { turn: ConversationRenderTurn }) {
	return (
		<span className="font-mono tabular-nums">
			Ran for {formatElapsed(turn.timing.elapsedMs)}
		</span>
	);
}
