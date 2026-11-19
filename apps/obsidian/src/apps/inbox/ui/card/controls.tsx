import { questionTitle } from '../../title.js';
import type { StudyQuestion } from '../../types.js';
import { Composer } from '../composer.js';
import type { QuestionSubmission } from '../composer.js';

type Props = {
	question: StudyQuestion;
	onFollowUp: (
		submission: QuestionSubmission,
		parentId: string,
	) => void | Promise<void>;
};

export function QuestionControls({ question, onFollowUp }: Props) {
	const { state } = question;
	const title = questionTitle(question);
	return (
		<div>
			{state.kind === 'answered' && (
				<div className="mt-3 animate-in fade-in-0 slide-in-from-top-1">
					<Composer
						compact
						label={`Follow up on: ${title}`}
						placeholder="Ask a follow-up…"
						onSubmit={(submission) => onFollowUp(submission, question.id)}
					/>
				</div>
			)}
		</div>
	);
}
