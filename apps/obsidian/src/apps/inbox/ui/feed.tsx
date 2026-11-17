import { Inbox } from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { QuestionNavigation } from './navigation.js';
import { QuestionCard } from './card/index.js';
import type { StudyQuestion, QuestionSource } from '../types.js';
import { useFeedMotion } from './use-feed-motion.js';

type Props = {
	questions: StudyQuestion[];
	navigation?: QuestionNavigation;
	onFollowUp: (text: string, parentId: string) => void | Promise<void>;
	onOpenSource?: (source: QuestionSource) => void;
	renderAnswer?: (answer: string) => ReactNode;
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

export function QuestionFeed({ questions, navigation, ...actions }: Props) {
	const [focusedId, setFocusedId] = useState<string>();
	const container = useRef<HTMLDivElement>(null);
	useFeedMotion(container);
	useLayoutEffect(() => {
		if (!navigation) return;
		const card = [
			...(container.current?.querySelectorAll<HTMLElement>('article') ?? []),
		].find((element) => element.id === `question-${navigation.questionId}`);
		if (!card) return;
		setFocusedId(navigation.questionId);
		card.scrollIntoView({ block: 'nearest' });
		card
			.querySelector<HTMLButtonElement>('.study-question-title')
			?.focus({ preventScroll: true });
	}, [navigation]);
	const ordered = [...questions].sort(
		(a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt),
	);
	const children = Map.groupBy(ordered, (question) => question.parentId);
	const roots = [...(children.get(undefined) ?? [])].reverse();
	const days = Map.groupBy(roots, (question) =>
		new Date(question.createdAt).toDateString(),
	);

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key !== 'Escape') return;
		setFocusedId(undefined);
		if (event.target instanceof HTMLTextAreaElement) event.target.blur();
	}

	function renderQuestion(
		question: StudyQuestion,
		parent?: StudyQuestion,
		inheritedSource?: QuestionSource,
	) {
		const replies = children.get(question.id) ?? [];
		const source = question.source ?? inheritedSource;
		return (
			<div className="min-w-0" key={question.id}>
				<QuestionCard
					question={question}
					source={source}
					parent={parent}
					childCount={replies.length}
					focused={focusedId === question.id}
					onFocus={setFocusedId}
					{...actions}
				/>
				{replies.length > 0 && (
					<div className="study-children ml-px flex min-w-0 flex-col gap-3 pt-2 pl-4 shadow-[-1px_0_0_var(--border)] [&_.study-children]:pl-2">
						{replies.map((reply) => renderQuestion(reply, question, source))}
					</div>
				)}
			</div>
		);
	}

	return (
		<div
			className="study-feed min-h-0 flex-1 select-text overflow-y-auto px-4 pb-6 [overflow-anchor:none] [scrollbar-width:thin] @min-[380px]:px-6"
			ref={container}
			onKeyDown={handleKeyDown}
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
