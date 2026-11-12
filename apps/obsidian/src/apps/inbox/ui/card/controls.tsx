import { RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@franklin/ui';
import { questionTitle } from '../../title.js';
import type { StudyQuestion } from '../../types.js';
import { Composer } from '../composer.js';

type Props = {
	question: StudyQuestion;
	actions?: ReactNode;
	onFollowUp: (text: string, parentId: string) => void | Promise<void>;
	onRetry: (id: string) => void;
};

export function QuestionControls({
	question,
	actions,
	onFollowUp,
	onRetry,
}: Props) {
	const { state } = question;
	const title = questionTitle(question);
	return (
		<div>
			<div className="flex min-h-6 flex-wrap items-center gap-3">
				{actions}
				{state.kind === 'failed' && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="gap-1.5 text-[var(--text-error)]"
						onClick={() => onRetry(question.id)}
					>
						<RotateCcw size={12} />
						Retry
					</Button>
				)}
			</div>
			{state.kind === 'answered' && (
				<div className="mt-3 animate-in fade-in-0 slide-in-from-top-1">
					<Composer
						compact
						label={`Follow up on: ${title}`}
						placeholder="Ask a follow-up…"
						onSubmit={async (text) => {
							await onFollowUp(text, question.id);
						}}
					/>
				</div>
			)}
		</div>
	);
}
