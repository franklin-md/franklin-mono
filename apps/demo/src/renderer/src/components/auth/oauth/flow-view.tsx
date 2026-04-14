import { Button } from '@franklin/ui';
import { Loader2 } from 'lucide-react';

import type { FlowState } from './types.js';

/**
 * Inline step display shown beneath a provider row while an OAuth flow is
 * in progress, succeeded, or errored.
 */
export function OAuthFlowView({
	state,
	onDismiss,
}: {
	state: FlowState;
	onDismiss: () => void;
}) {
	return (
		<div className="border-t border-border bg-muted/50 px-3.5 py-3">
			{state.phase === 'starting' && (
				<p className="text-sm text-muted-foreground">Starting login flow...</p>
			)}

			{state.phase === 'in-progress' && (
				<p className="text-sm text-muted-foreground">{state.message}</p>
			)}

			{state.phase === 'waiting' && (
				<div className="flex items-center gap-2">
					<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
					<p className="text-sm text-muted-foreground">
						Waiting for authentication... Browser opened.
					</p>
				</div>
			)}

			{state.phase === 'success' && (
				<div className="flex items-center gap-2">
					<span className="text-sm text-green-700">
						&#10003; Successfully signed in!
					</span>
					<Button variant="outline" size="sm" onClick={onDismiss}>
						Dismiss
					</Button>
				</div>
			)}

			{state.phase === 'error' && (
				<div>
					<p className="mb-2 text-sm text-destructive">
						Error: {state.message}
					</p>
					<Button variant="outline" size="sm" onClick={onDismiss}>
						Dismiss
					</Button>
				</div>
			)}
		</div>
	);
}
