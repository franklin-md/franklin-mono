import { formatElapsed } from '@franklin/lib';
import { useElapsed, type ConversationRenderTurn } from '@franklin/react';

import { StatusIndicator } from '../../components/status-indicator.js';

export function Waiting({ turn }: { turn: ConversationRenderTurn }) {
	const elapsed = useElapsed(turn.timing.promptedAt);
	return (
		<div className="flex items-center gap-2 text-muted-foreground">
			<StatusIndicator status="in-progress" />
			<span className="font-mono text-xs tabular-nums">
				{formatElapsed(elapsed)}
			</span>
		</div>
	);
}
