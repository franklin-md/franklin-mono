import { formatElapsed } from '@franklin/lib';
import { useElapsed, type ConversationRenderTurn } from '@franklin/react';

import { StatusIndicator } from '../../components/status-indicator.js';
import { RowInset } from '../row-inset.js';

export function Waiting({ turn }: { turn: ConversationRenderTurn }) {
	const elapsed = useElapsed(turn.timing.promptedAt);
	return (
		<RowInset>
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<StatusIndicator status="in-progress" />
				<span className="font-mono tabular-nums">{formatElapsed(elapsed)}</span>
			</div>
		</RowInset>
	);
}
