import type { ConversationRenderTurn } from '@franklin/react';

import { RowInset } from '../../row-inset.js';

import { TurnFooterActions } from './actions.js';
import { TurnCost } from './cost.js';
import { formatTurnCost } from './format-cost.js';
import { TurnDetailsTooltip } from './details-tooltip.js';
import { useTurnFooterActions } from './hooks.js';

export interface TurnFooterProps {
	turn: ConversationRenderTurn;
}

export function TurnFooter({ turn }: TurnFooterProps) {
	const { assistantText, hasActions, hasCopy, hasFork } =
		useTurnFooterActions(turn);

	const usage = turn.response.blocks.find(
		(block) => block.kind === 'turnEnd',
	)?.usage;
	const cost = formatTurnCost(usage?.cost.total);

	return (
		<RowInset>
			<div className="flex animate-in fade-in-0 slide-in-from-bottom-3 items-center gap-2 text-xs text-muted-foreground duration-1000 ease-out fill-mode-both">
				<TurnDetailsTooltip turn={turn} />
				{cost !== undefined ? (
					<>
						<span aria-hidden className="text-muted-foreground/60">
							·
						</span>
						<TurnCost amount={cost} />
					</>
				) : null}
				{hasActions ? (
					<span aria-hidden className="text-muted-foreground/60">
						·
					</span>
				) : null}
				{hasActions ? (
					<TurnFooterActions
						assistantText={assistantText}
						hasCopy={hasCopy}
						hasFork={hasFork}
					/>
				) : null}
			</div>
		</RowInset>
	);
}
