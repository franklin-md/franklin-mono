import type { MouseEvent, ReactNode } from 'react';
import { useId } from 'react';
import { cn } from '@franklin/ui';
import type { StudyQuestion, QuestionSource } from '../../types.js';
import type { QuestionSubmission } from '../composer.js';
import { QuestionHeader } from './header.js';
import { QuestionBody } from './body.js';
import { QuestionFooter } from './footer.js';
import { QuestionInfo } from './info.js';
import { QuestionControls } from './controls.js';
import { hasTextSelection } from './has-text-selection.js';

type Props = {
	question: StudyQuestion;
	source?: QuestionSource;
	parent?: StudyQuestion;
	childCount: number;
	focused: boolean;
	actions?: ReactNode;
	onFocus: (id?: string) => void;
	onFollowUp: (
		submission: QuestionSubmission,
		parentId: string,
	) => void | Promise<void>;
	onOpenSource?: (source: QuestionSource) => void;
	onDelete: (id: string) => void;
	onRetry: (id: string) => void;
};

export function QuestionCard({
	question,
	source,
	parent,
	childCount,
	focused,
	actions,
	onFocus,
	onFollowUp,
	onDelete,
	onRetry,
	onOpenSource,
}: Props) {
	const titleId = useId();
	const footerId = useId();
	function handleClick(event: MouseEvent<HTMLElement>) {
		// A selection drag must stay a selection, and controls own their clicks.
		const summary =
			event.target instanceof Element ? event.target.closest('summary') : null;
		if (hasTextSelection(summary ?? event.currentTarget, event.detail)) {
			if (summary) event.preventDefault();
			return;
		}
		if (
			event.target instanceof Element &&
			event.target.closest('button, a, input, textarea, select, pre, footer')
		)
			return;
		// Disclosure interaction activates its card without toggling it off.
		if (
			event.target instanceof Element &&
			event.target.closest('summary, .study-answer-details')
		) {
			onFocus(question.id);
			return;
		}
		onFocus(focused ? undefined : question.id);
	}

	return (
		<article
			id={`question-${question.id}`}
			className={cn(
				'study-question group/question relative min-w-0 scroll-my-4 rounded-xl bg-muted p-4 ring-1 ring-inset ring-border animate-in fade-in-0 slide-in-from-top-2 duration-300 [&_svg]:shrink-0',
				focused && 'study-question-focused bg-primary/5 ring-2 ring-primary/60',
			)}
			onClick={handleClick}
			aria-labelledby={titleId}
		>
			<QuestionHeader
				question={question}
				parent={parent}
				childCount={childCount}
				focused={focused}
				titleId={titleId}
				footerId={footerId}
				onFocus={onFocus}
				onDelete={onDelete}
			/>
			<QuestionBody state={question.state} expanded={focused} />
			<QuestionFooter
				id={footerId}
				focused={focused}
				info={
					<QuestionInfo
						question={question}
						source={source}
						onOpenSource={onOpenSource}
					/>
				}
				controls={
					<>
						{actions}
						<QuestionControls
							question={question}
							onFollowUp={onFollowUp}
							onRetry={onRetry}
						/>
					</>
				}
			/>
		</article>
	);
}
