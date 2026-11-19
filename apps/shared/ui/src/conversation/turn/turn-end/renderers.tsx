import type { ReactNode } from 'react';
import type { TurnEndBlock } from '@franklin/agent';

import { Badge } from '../../../primitives/badge.js';

import { ConnectionsButton } from './connections-button.js';
import { TurnEndNotice } from './notice.js';

export function FinishedRenderer(_block: TurnEndBlock) {
	return null;
}

export function CancelledRenderer(_block: TurnEndBlock) {
	return (
		<Badge
			variant="secondary"
			className="w-fit text-muted-foreground font-normal"
		>
			Cancelled
		</Badge>
	);
}

export function MaxTokensRenderer(block: TurnEndBlock, actions?: ReactNode) {
	return (
		<TurnEndNotice
			tone="warning"
			title="Response was cut short"
			message={block.stopMessage}
			actions={actions}
		/>
	);
}

export function AuthRenderer(block: TurnEndBlock, actions?: ReactNode) {
	return (
		<TurnEndNotice
			tone="error"
			title="Sign-in required"
			message={block.stopMessage}
			actions={
				<>
					<ConnectionsButton />
					{actions}
				</>
			}
		/>
	);
}

export function ErrorRenderer(block: TurnEndBlock, actions?: ReactNode) {
	return (
		<TurnEndNotice
			tone="error"
			title="Something went wrong"
			message={block.stopMessage}
			actions={actions}
		/>
	);
}
