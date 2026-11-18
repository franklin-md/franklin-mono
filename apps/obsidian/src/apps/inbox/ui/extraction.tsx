import { Button } from '@franklin/ui';
import { LoaderCircle } from 'lucide-react';
import type { ThoughtDump } from '../modes/types.js';

type Props = {
	dump: ThoughtDump;
	onRetry?: (id: string) => void;
	onDismiss?: (id: string) => void;
};

export function ExtractionProgress({ dump, onRetry, onDismiss }: Props) {
	if (dump.state.kind === 'succeeded') return null;
	const failed = dump.state.kind === 'failed';
	return (
		<div className="min-w-0 rounded-xl bg-muted/40 p-4 text-xs ring-1 ring-inset ring-border">
			<p
				className="m-0 flex items-center gap-2 text-muted-foreground"
				role={failed ? 'alert' : 'status'}
			>
				{dump.state.kind === 'running' && (
					<LoaderCircle
						size={14}
						aria-hidden="true"
						className="shrink-0 animate-spin motion-reduce:animate-none"
					/>
				)}
				<span className="min-w-0 wrap-anywhere">{statusText(dump)}</span>
			</p>
			{failed && (
				<p className="mt-2 mb-0 line-clamp-2 wrap-anywhere text-muted-foreground">
					{dump.text}
				</p>
			)}
			{failed && onRetry && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => onRetry(dump.id)}
				>
					Retry extraction
				</Button>
			)}
			{failed && onDismiss && (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => onDismiss(dump.id)}
				>
					Dismiss
				</Button>
			)}
		</div>
	);
}

function statusText({ state }: ThoughtDump): string {
	switch (state.kind) {
		case 'queued':
			return 'Waiting to organize questions…';
		case 'running':
			return 'Organizing questions…';
		case 'failed':
			return state.error;
		case 'succeeded':
			return '';
	}
}
