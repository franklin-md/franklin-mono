import { ChevronRight, GitBranch, Trash2 } from 'lucide-react';
import { IconButton, cn } from '@franklin/ui';
import type { MouseEvent } from 'react';
import { questionTitle } from '../../title.js';
import type { StudyQuestion } from '../../types.js';
import { hasTextSelection } from './has-text-selection.js';

type Props = {
	question: StudyQuestion;
	parent?: StudyQuestion;
	childCount: number;
	focused: boolean;
	titleId: string;
	footerId: string;
	onFocus: (id?: string) => void;
	onDelete: (id: string) => void;
};

export function QuestionHeader({
	question,
	parent,
	childCount,
	focused,
	titleId,
	footerId,
	onFocus,
	onDelete,
}: Props) {
	const title = questionTitle(question);
	function navigateParent(event: MouseEvent<HTMLButtonElement>) {
		if (!parent || hasTextSelection(event.currentTarget, event.detail)) return;
		onFocus(parent.id);
		event.currentTarget.ownerDocument
			.getElementById(`question-${parent.id}`)
			?.scrollIntoView({ block: 'start' });
	}
	function toggleFocus(event: MouseEvent<HTMLButtonElement>) {
		if (!hasTextSelection(event.currentTarget, event.detail))
			onFocus(focused ? undefined : question.id);
	}
	return (
		<header>
			<IconButton
				icon={Trash2}
				type="button"
				className="absolute top-3 right-3 size-6 opacity-0 group-hover/question:opacity-100 group-focus-within/question:opacity-100 hover:text-[var(--text-error)] [@media(hover:none)]:opacity-100"
				aria-label={`Delete question: ${title}`}
				title={
					childCount ? 'Delete question and its follow-ups' : 'Delete question'
				}
				onClick={() => onDelete(question.id)}
			/>
			{parent && (
				<button
					type="button"
					className="mb-2 flex h-auto w-full min-w-0 cursor-pointer select-text items-center gap-1.5 pr-6 text-left text-xs text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
					onClick={navigateParent}
				>
					<GitBranch size={12} />
					<span className="min-w-0 truncate">
						Follow-up to {questionTitle(parent)}
					</span>
				</button>
			)}
			<h3
				id={titleId}
				className="m-0 min-w-0 pr-6 text-base leading-normal font-semibold tracking-tight"
			>
				<button
					type="button"
					className="flex h-auto w-full min-w-0 max-w-full cursor-pointer select-text items-start gap-2 whitespace-normal text-left text-base leading-normal font-semibold tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
					aria-expanded={focused}
					aria-controls={footerId}
					onClick={toggleFocus}
				>
					<ChevronRight
						size={15}
						aria-hidden="true"
						className={cn(
							'mt-1 shrink-0 text-muted-foreground transition-transform',
							focused && 'rotate-90',
						)}
					/>
					<span className="min-w-0 flex-1 wrap-anywhere">{title}</span>
				</button>
			</h3>
		</header>
	);
}
