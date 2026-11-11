import {
	ChevronDown,
	GitBranch,
	LoaderCircle,
	MessageCircle,
	Trash2,
	TriangleAlert,
} from 'lucide-react';
import { IconButton, cn } from '@franklin/ui';
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
	const { state } = question;
	const title = questionTitle(question);
	const status = {
		failed: 'Failed',
		running: 'Answering',
		queued: 'Queued',
	};
	const icons = {
		failed: TriangleAlert,
		running: LoaderCircle,
		queued: MessageCircle,
	};
	const StatusIcon = state.kind !== 'answered' ? icons[state.kind] : undefined;
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
					onClick={(event) => {
						if (hasTextSelection(event.currentTarget)) return;
						onFocus(parent.id);
						event.currentTarget.ownerDocument
							.getElementById(`question-${parent.id}`)
							?.scrollIntoView({ block: 'start' });
					}}
				>
					<GitBranch size={12} />
					<span className="min-w-0 truncate">
						Follow-up to {questionTitle(parent)}
					</span>
				</button>
			)}
			{state.kind !== 'answered' && StatusIcon && (
				<div className="mb-1 flex h-5 items-center gap-2 pr-6 text-xs">
					<span
						className={cn(
							'inline-flex items-center gap-1.5 text-muted-foreground',
							state.kind === 'failed' && 'text-[var(--text-error)]',
							state.kind === 'running' && 'text-primary',
						)}
					>
						<StatusIcon
							size={12}
							className={cn(
								state.kind === 'running' &&
									'animate-spin motion-reduce:animate-none',
							)}
						/>
						{status[state.kind]}
					</span>
				</div>
			)}
			<h3
				id={titleId}
				className="m-0 min-w-0 pr-6 text-base leading-normal font-semibold tracking-tight"
			>
				<button
					type="button"
					className="study-question-title flex h-auto w-full min-w-0 max-w-full cursor-pointer select-text items-start justify-between gap-2.5 whitespace-normal text-left text-base leading-normal font-semibold tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
					aria-expanded={focused}
					aria-controls={footerId}
					onClick={(event) => {
						if (!hasTextSelection(event.currentTarget))
							onFocus(focused ? undefined : question.id);
					}}
				>
					<span className="min-w-0 flex-1 wrap-anywhere">{title}</span>
					<ChevronDown
						size={15}
						className={cn(
							'mt-1 text-muted-foreground transition-transform',
							focused && 'rotate-180',
						)}
					/>
				</button>
			</h3>
		</header>
	);
}
