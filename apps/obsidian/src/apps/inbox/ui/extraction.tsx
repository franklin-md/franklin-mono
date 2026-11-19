import { LoaderCircle } from 'lucide-react';
import { Button } from '@franklin/ui';
import type { ThoughtDump } from '../modes/types.js';
import { FailureNotice } from '../../../shared/ui/failure/index.js';
import { RetryButton } from '../../../shared/ui/failure/retry.js';

type Props = {
	dump: ThoughtDump;
	onRetry?: (id: string) => void;
	onDismiss?: (id: string) => void;
};

export function ExtractionProgress({ dump, onRetry, onDismiss }: Props) {
	const { state } = dump;
	if (state.kind === 'succeeded') return null;
	return (
		<div className="flex min-w-0 flex-col gap-3 rounded-xl bg-muted/40 p-4 text-xs ring-1 ring-inset ring-border">
			{state.kind === 'failed' ? (
				<>
					<p className="m-0 line-clamp-2 wrap-anywhere text-muted-foreground">
						{dump.text}
					</p>
					<FailureNotice
						message={state.error}
						stopCode={state.stopCode}
						actions={
							<>
								{onRetry && (
									<RetryButton
										label="Retry extraction"
										onClick={() => onRetry(dump.id)}
									/>
								)}
								{onDismiss && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => onDismiss(dump.id)}
									>
										Dismiss
									</Button>
								)}
							</>
						}
					/>
				</>
			) : (
				<p
					className="m-0 flex items-center gap-2 text-muted-foreground"
					role="status"
				>
					{state.kind === 'running' && (
						<LoaderCircle
							size={14}
							aria-hidden="true"
							className="shrink-0 animate-spin motion-reduce:animate-none"
						/>
					)}
					<span className="min-w-0 wrap-anywhere">
						{state.kind === 'running'
							? 'Organizing questions…'
							: 'Waiting to organize questions…'}
					</span>
				</p>
			)}
		</div>
	);
}
