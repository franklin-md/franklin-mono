import { LoaderCircle } from 'lucide-react';
import type { QuestionState } from '../../types.js';
import { QuestionAnswer } from '../answer.js';
import { FailureNotice } from '../../../../shared/ui/failure/index.js';
import { RetryButton } from '../../../../shared/ui/failure/retry.js';

type Props = {
	state: QuestionState;
	expanded: boolean;
	onRetry: () => void;
};

export function QuestionBody({ state, expanded, onRetry }: Props) {
	const active = state.kind === 'running' || state.kind === 'queued';
	return (
		<div>
			{state.kind === 'answered' && (
				<QuestionAnswer answer={state} expanded={expanded} />
			)}
			{active && (
				<div
					className="mt-3 mb-1 flex min-h-6 items-center gap-2 text-xs text-muted-foreground"
					role="status"
				>
					{state.kind === 'running' ? (
						<>
							<LoaderCircle
								size={12}
								className="animate-spin motion-reduce:animate-none"
								aria-hidden="true"
							/>
							<span>Preparing an answer…</span>
						</>
					) : (
						'Waiting to start…'
					)}
				</div>
			)}
			{state.kind === 'failed' && (
				<div className="mt-3">
					<FailureNotice
						message={state.error}
						stopCode={state.stopCode}
						actions={<RetryButton onClick={onRetry} />}
					/>
				</div>
			)}
		</div>
	);
}
