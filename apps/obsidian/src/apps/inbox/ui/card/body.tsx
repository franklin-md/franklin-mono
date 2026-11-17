import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { QuestionState } from '../../types.js';
import { QuestionAnswer } from '../answer.js';

type Props = {
	state: QuestionState;
	expanded: boolean;
	renderAnswer?: (answer: string) => ReactNode;
};

export function QuestionBody({ state, expanded, renderAnswer }: Props) {
	const active = state.kind === 'running' || state.kind === 'queued';
	return (
		<div>
			{state.kind === 'answered' && (
				<QuestionAnswer
					answer={state}
					expanded={expanded}
					renderAnswer={renderAnswer}
				/>
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
				<p className="mt-2 mb-0 text-xs wrap-anywhere text-[var(--text-error)]">
					{state.error}
				</p>
			)}
		</div>
	);
}
