import type { ConversationRenderTurn } from '@franklin/react';

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../../../primitives/tooltip.js';
import { TurnRuntime } from '../runtime.js';

export interface TurnDetailsTooltipProps {
	turn: ConversationRenderTurn;
}

function formatCount(value: number): string {
	return new Intl.NumberFormat('en-US').format(value);
}

export function TurnDetailsTooltip({ turn }: TurnDetailsTooltipProps) {
	const usage = turn.response.blocks.find(
		(block) => block.kind === 'turnEnd',
	)?.usage;

	return (
		<TooltipProvider delayDuration={0}>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						aria-label="Turn details"
						className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					>
						<TurnRuntime turn={turn} />
					</button>
				</TooltipTrigger>
				<TooltipContent className="min-w-56 p-3">
					{usage ? (
						<div className="space-y-2 text-xs">
							<div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
								<span className="text-muted-foreground">Input</span>
								<span className="text-right font-mono tabular-nums">
									{formatCount(usage.tokens.input)}
								</span>
								<span className="text-muted-foreground">Output</span>
								<span className="text-right font-mono tabular-nums">
									{formatCount(usage.tokens.output)}
								</span>
								<span className="text-muted-foreground">Cache read</span>
								<span className="text-right font-mono tabular-nums">
									{formatCount(usage.tokens.cacheRead)}
								</span>
								<span className="text-muted-foreground">Cache write</span>
								<span className="text-right font-mono tabular-nums">
									{formatCount(usage.tokens.cacheWrite)}
								</span>
							</div>
						</div>
					) : (
						<p className="text-xs text-muted-foreground">
							Usage details unavailble
						</p>
					)}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
