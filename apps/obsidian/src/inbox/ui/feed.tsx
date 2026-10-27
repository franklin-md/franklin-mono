import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';

import { QuestionCard } from './card.js';
import type { StudyQuestion, QuestionSource } from '../types.js';
import { useFeedMotion } from './use-feed-motion.js';

type Props = {
	questions: StudyQuestion[];
	onFollowUp: (text: string, parentId: string) => void | Promise<void>;
	onOpenSource?: (source: QuestionSource) => void;
	renderAnswer?: (answer: string) => ReactNode;
	renderActions?: (question: StudyQuestion) => ReactNode;
	onDelete: (id: string) => void;
	onRetry: (id: string) => void;
};

const dayFormat = new Intl.DateTimeFormat(undefined, {
	month: 'long',
	day: 'numeric',
});
function dayLabel(timestamp: number) {
	const date = new Date(timestamp);
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);
	if (date.toDateString() === today.toDateString()) return 'Today';
	if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
	return dayFormat.format(date);
}

export function QuestionFeed({ questions, renderActions, ...actions }: Props) {
	const [focusedId, setFocusedId] = useState<string>();
	const container = useRef<HTMLDivElement>(null);
	useFeedMotion(container);
	const roots = questions
		.filter((question) => !question.parentId)
		.sort((a, b) => b.createdAt - a.createdAt);
	const days = Map.groupBy(roots, (question) =>
		new Date(question.createdAt).toDateString(),
	);

	function renderQuestion(
		question: StudyQuestion,
		source?: QuestionSource,
		parent?: StudyQuestion,
	) {
		const children = questions
			.filter((child) => child.parentId === question.id)
			.sort((a, b) => a.createdAt - b.createdAt);
		const origin = question.source ?? source;
		return (
			<div className="study-question-branch" key={question.id}>
				<QuestionCard
					question={question}
					source={origin}
					parent={parent}
					childCount={children.length}
					focused={focusedId === question.id}
					onFocus={setFocusedId}
					actions={renderActions?.(question)}
					{...actions}
				/>
				{children.length > 0 && (
					<div className="study-children">
						{children.map((child) => renderQuestion(child, origin, question))}
					</div>
				)}
			</div>
		);
	}

	return (
		<div
			className="study-feed"
			ref={container}
			onKeyDown={(event) => {
				if (event.key === 'Escape') {
					setFocusedId(undefined);
					if (event.target instanceof HTMLTextAreaElement) event.target.blur();
				}
			}}
		>
			{roots.length === 0 && (
				<div className="study-empty">
					<Inbox size={30} strokeWidth={1} />
					<h3>No questions yet</h3>
					<p>
						Highlight a passage or ask above.
						<br />
						Answers will appear here.
					</p>
				</div>
			)}
			{[...days.entries()].map(([day, items]) => {
				const first = items[0];
				if (!first) return null;
				return (
					<section
						className="study-day"
						key={day}
						aria-label={dayLabel(first.createdAt)}
					>
						<div className="study-day-heading">
							<h2>{dayLabel(first.createdAt)}</h2>
							<span>{dayFormat.format(first.createdAt)}</span>
							<span className="study-day-line" />
							<span>{items.length}</span>
						</div>
						<div className="study-day-questions">
							{items.map((question) => renderQuestion(question))}
						</div>
					</section>
				);
			})}
			{roots.length > 0 && <p className="study-feed-end">End of inbox</p>}
		</div>
	);
}
