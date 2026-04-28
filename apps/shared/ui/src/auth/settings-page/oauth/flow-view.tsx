import type { ReactNode } from 'react';

import type { OAuthFlowState } from '@franklin/react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import { cn } from '../../../lib/cn.js';
import { Button } from '../../../primitives/button.js';

export interface OAuthFlowViewProps {
	state: OAuthFlowState;
	onDismiss: () => void;
}

export function OAuthFlowView({ state, onDismiss }: OAuthFlowViewProps) {
	switch (state.phase) {
		case 'idle':
			return null;
		case 'starting':
			return (
				<FlowPanel>
					<p>Starting login flow...</p>
				</FlowPanel>
			);
		case 'in-progress':
			return (
				<FlowPanel>
					<p>{state.message}</p>
				</FlowPanel>
			);
		case 'waiting':
			return (
				<FlowPanel>
					<Loader2
						aria-hidden="true"
						className="h-3.5 w-3.5 shrink-0 animate-spin"
					/>
					<p>Waiting for authentication. Browser opened.</p>
				</FlowPanel>
			);
		case 'success':
			return (
				<FlowPanel className="text-green-700">
					<CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
					<p className="flex-1">Successfully signed in.</p>
					<DismissButton onDismiss={onDismiss} />
				</FlowPanel>
			);
		case 'error':
			return (
				<FlowPanel className="text-destructive">
					<AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
					<p className="flex-1">Error: {state.message}</p>
					<DismissButton onDismiss={onDismiss} />
				</FlowPanel>
			);
	}
}

function FlowPanel({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'flex items-center gap-2 rounded-md bg-muted/50 px-3.5 py-3 text-sm text-muted-foreground ring-1 ring-inset ring-border/70',
				className,
			)}
		>
			{children}
		</div>
	);
}

function DismissButton({ onDismiss }: { onDismiss: () => void }) {
	return (
		<Button size="sm" variant="outline" onClick={onDismiss}>
			Dismiss
		</Button>
	);
}
