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
		<div className="study-actions">
			{definitions.map((action) => {
				const run = runs.find((run) => run.action.id === action.id);
				const state = run?.state;
				const definition = run?.action ?? action;
				return (
					<div className="study-action" key={action.id}>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="study-text-button h-7 border-0 px-2 ring-1 ring-inset ring-input"
							title={definition.prompt}
							aria-label={`Run ${definition.name}`}
							disabled={!!run}
							onClick={() => onRun(action.id)}
						>
							{definition.name}
							{state?.kind === 'running' && (
								<LoaderCircle size={12} className="study-spin" />
							)}
							{state?.kind === 'queued' && ' Queued'}
							{state?.kind === 'running' && ' Working…'}
							{state?.kind === 'succeeded' && ' Finishing…'}
							{state?.kind === 'failed' && ' Failed'}
						</Button>
						{run && state?.kind === 'failed' && (
							<>
								<button
									type="button"
									className="study-text-button study-retry"
									aria-label={`Retry ${run.action.name}`}
									onClick={() => onRetry(run.id)}
								>
									Retry
								</button>
								<button
									type="button"
									className="study-text-button"
									aria-label={`Dismiss ${run.action.name}`}
									onClick={() => onDismiss(run.id)}
								>
									Dismiss
								</button>
								<p className="study-action-error" role="alert">
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
