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
			<div className="min-w-0" key={question.id}>
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
				{/* Keep replies closer than independent threads, with shallow nested indentation. */}
				{children.length > 0 && (
					<div className="study-children ml-px flex min-w-0 flex-col gap-3 pt-2 pl-4 shadow-[-1px_0_0_var(--border)] [&_.study-children]:pl-2">
						{children.map((child) => renderQuestion(child, origin, question))}
					</div>
				)}
			</div>
		);
	}

	return (
		<div
			className="study-feed min-h-0 flex-1 select-text overflow-y-auto px-4 pb-6 [overflow-anchor:none] [scrollbar-width:thin] @min-[380px]:px-6"
			ref={container}
			onKeyDown={(event) => {
				if (event.key === 'Escape') {
					setFocusedId(undefined);
					if (event.target instanceof HTMLTextAreaElement) event.target.blur();
				}
			}}
		>
			{roots.length === 0 && (
				<div className="px-2 py-16 text-center text-muted-foreground">
					<Inbox
						size={30}
						strokeWidth={1}
						className="mx-auto mb-4 text-primary opacity-50"
					/>
					<h3 className="mt-0 mb-2 text-sm font-medium">No questions yet</h3>
					<p className="m-0 text-xs leading-relaxed">
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
						className="mt-1 not-first:mt-6"
						key={day}
						aria-label={dayLabel(first.createdAt)}
					>
						<div className="mb-4 flex items-center gap-2.5 text-xs text-muted-foreground">
							<h2 className="m-0 text-xs font-semibold">
								{dayLabel(first.createdAt)}
							</h2>
							<span>{dayFormat.format(first.createdAt)}</span>
							<span className="h-px flex-1 bg-border" />
							<span>{items.length}</span>
						</div>
						<div className="flex flex-col gap-7">
							{items.map((question) => renderQuestion(question))}
						</div>
					</section>
				);
			})}
			{roots.length > 0 && (
				<p className="mt-0 mb-0 pt-7 pb-1 text-center text-xs text-muted-foreground">
					End of inbox
				</p>
			)}
		</div>
	);
}
