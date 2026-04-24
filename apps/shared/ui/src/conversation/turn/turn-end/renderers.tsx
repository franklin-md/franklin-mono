import type { TurnEndBlock } from '@franklin/extensions';
import { StopCode } from '@franklin/mini-acp';

import { Badge } from '../../../primitives/badge.js';

function CancelledChip() {
	return (
		<Badge
			variant="secondary"
			className="w-fit text-muted-foreground font-normal"
		>
			Cancelled
		</Badge>
	);
}

function ErrorBadge({ block }: { block: TurnEndBlock }) {
	const isWarning = block.stopCode === StopCode.MaxTokens;
	const message =
		block.stopMessage ??
		(isWarning ? 'Response was cut short' : 'Something went wrong');

	return (
		<Badge
			variant={isWarning ? 'outline' : 'destructive'}
			className={
				isWarning
					? 'w-fit border-amber-500/40 bg-amber-500/10 text-amber-600 font-normal'
					: 'w-fit font-normal'
			}
		>
			{message}
		</Badge>
	);
}

export function FinishedRenderer(_block: TurnEndBlock) {
	return null;
}

export function CancelledRenderer(_block: TurnEndBlock) {
	return <CancelledChip />;
}

export function ErrorRenderer(block: TurnEndBlock) {
	return <ErrorBadge block={block} />;
}
