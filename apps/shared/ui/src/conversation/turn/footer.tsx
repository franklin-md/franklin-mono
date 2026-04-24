import type { ConversationRenderTurn } from '@franklin/react';

import { ForkButton } from '../../agent-selector/fork-button.js';
import { RowInset } from '../row-inset.js';

import { TurnRuntime } from './runtime.js';

export function TurnFooter({ turn }: { turn: ConversationRenderTurn }) {
	return (
		<RowInset>
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				<TurnRuntime turn={turn} />
				{turn.isLast ? <ForkButton /> : null}
			</div>
		</RowInset>
	);
}
