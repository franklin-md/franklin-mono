import { LoaderCircle } from 'lucide-react';
import { Button } from '@franklin/ui';
import type { InboxAction, InboxActionRun } from '../actions/types.js';

type Props = {
	actions: InboxAction[];
	runs: InboxActionRun[];
	onRun: (actionId: string) => void;
	onRetry: (runId: string) => void;
	onDismiss: (runId: string) => void;
};

export function QuestionActions({
	actions,
	runs,
	onRun,
	onRetry,
	onDismiss,
}: Props) {
	const definitions = [
		...actions,
		...runs
			.filter((run) => !actions.some((action) => action.id === run.action.id))
			.map((run) => run.action),
	];
	return (
		<div className="flex min-w-0 max-w-full flex-wrap gap-2">
			{definitions.map((action) => {
				const run = runs.find((run) => run.action.id === action.id);
				const state = run?.state;
				const definition = run?.action ?? action;
				return (
					<div
						className="flex max-w-full flex-wrap items-center gap-1.5"
						key={action.id}
					>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-auto min-h-8 max-w-full gap-1.5 py-1.5 text-left whitespace-normal wrap-anywhere"
							title={definition.prompt}
							aria-label={`Run ${definition.name}`}
							disabled={!!run}
							onClick={() => onRun(action.id)}
						>
							{definition.name}
							{state?.kind === 'running' && (
								<LoaderCircle
									size={12}
									className="shrink-0 animate-spin motion-reduce:animate-none"
								/>
							)}
							{state?.kind === 'queued' && ' Queued'}
							{state?.kind === 'running' && ' Working…'}
							{state?.kind === 'succeeded' && ' Finishing…'}
							{state?.kind === 'failed' && ' Failed'}
						</Button>
						{run && state?.kind === 'failed' && (
							<>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="text-[var(--text-error)]"
									aria-label={`Retry ${run.action.name}`}
									onClick={() => onRetry(run.id)}
								>
									Retry
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									aria-label={`Dismiss ${run.action.name}`}
									onClick={() => onDismiss(run.id)}
								>
									Dismiss
								</Button>
								<p
									className="m-0 basis-full text-xs wrap-anywhere text-[var(--text-error)]"
									role="alert"
								>
									{state.error}
								</p>
							</>
						)}
					</div>
				);
			})}
		</div>
	);
}
