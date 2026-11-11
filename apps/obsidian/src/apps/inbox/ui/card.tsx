import {
	ArrowUpRight,
	Check,
	ChevronDown,
	FileText,
	GitBranch,
	LoaderCircle,
	MessageCircle,
	RotateCcw,
	Trash2,
	TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, IconButton, cn } from '@franklin/ui';
import { useId, useState } from 'react';

import { Composer } from './composer.js';
import { QuestionAnswer } from './answer.js';
import { questionTitle } from '../title.js';
import type { StudyQuestion, QuestionSource } from '../types.js';

type Props = {
	question: StudyQuestion;
	source?: QuestionSource;
	parent?: StudyQuestion;
	childCount: number;
	focused: boolean;
	onFocus: (id?: string) => void;
	onFollowUp: (text: string, parentId: string) => void | Promise<void>;
	onOpenSource?: (source: QuestionSource) => void;
	renderAnswer?: (answer: string) => ReactNode;
	actions?: ReactNode;
	onDelete: (id: string) => void;
	onRetry: (id: string) => void;
};

const timeFormat = new Intl.DateTimeFormat(undefined, {
	hour: 'numeric',
	minute: '2-digit',
});

function hasTextSelection(element: HTMLElement): boolean {
	return element.ownerDocument.getSelection()?.isCollapsed === false;
}

export function QuestionCard({
	question,
	source,
	parent,
	childCount,
	focused,
	onFocus,
	onFollowUp,
	onDelete,
	onRetry,
	onOpenSource,
	renderAnswer,
	actions,
}: Props) {
	const [sourceOpen, setSourceOpen] = useState(false);
	const titleId = useId();
	const answerId = useId();
	const sourceId = useId();
	const sourceHref =
		source?.location && onOpenSource
			? `obsidian://open?file=${encodeURIComponent(source.location.path)}`
			: undefined;
	const { state } = question;
	const title = questionTitle(question);
	const active = state.kind === 'running' || state.kind === 'queued';
	const label = {
		answered: 'Answered',
		failed: 'Failed',
		running: 'Answering',
		queued: 'Queued',
	}[state.kind];
	const StatusIcon = {
		answered: Check,
		failed: TriangleAlert,
		running: LoaderCircle,
		queued: MessageCircle,
	}[state.kind];

	return (
		<article
			id={`question-${question.id}`}
			className={cn(
				'study-question group/question relative min-w-0 scroll-my-4 rounded-xl bg-muted p-4 ring-1 ring-inset ring-border animate-in fade-in-0 slide-in-from-top-2 duration-300 [&_svg]:shrink-0',
				focused && 'study-question-focused bg-primary/5 ring-2 ring-primary/60',
			)}
			onClick={(event) => {
				// A selection drag must stay a selection, and controls own their clicks.
				if (hasTextSelection(event.currentTarget)) {
					if (
						event.target instanceof Element &&
						event.target.closest('summary')
					)
						event.preventDefault();
					return;
				}
				if (
					event.target instanceof Element &&
					event.target.closest('button, a, input, textarea, select, pre')
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
			}}
			aria-labelledby={titleId}
		>
			{parent && (
				<button
					type="button"
					className="mb-2 flex h-auto w-full min-w-0 cursor-pointer select-text items-center gap-1.5 text-left text-xs text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
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
			<div className="mb-1 flex h-5 items-center gap-2 text-xs">
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
							state.kind === 'answered' && 'text-emerald-500',
						)}
					/>
					{label}
				</span>
				<time
					className="ml-auto text-muted-foreground"
					dateTime={new Date(question.createdAt).toISOString()}
				>
					{timeFormat.format(question.createdAt)}
				</time>
				<IconButton
					icon={Trash2}
					type="button"
					className="-mr-1 size-6 opacity-0 group-hover/question:opacity-100 group-focus-within/question:opacity-100 hover:text-[var(--text-error)] [@media(hover:none)]:opacity-100"
					aria-label={`Delete question: ${title}`}
					title={
						childCount
							? 'Delete question and its follow-ups'
							: 'Delete question'
					}
					onClick={() => onDelete(question.id)}
				/>
			</div>
			<h3
				id={titleId}
				className="m-0 min-w-0 text-sm leading-normal font-semibold tracking-tight"
			>
				<button
					type="button"
					className="study-question-title flex h-auto w-full min-w-0 max-w-full cursor-pointer select-text items-start justify-between gap-2.5 whitespace-normal text-left text-sm leading-normal font-semibold tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-default"
					aria-expanded={focused}
					aria-controls={answerId}
					disabled={state.kind !== 'answered'}
					onClick={(event) => {
						if (!hasTextSelection(event.currentTarget))
							onFocus(focused ? undefined : question.id);
					}}
				>
					<span className="min-w-0 flex-1 wrap-anywhere">{title}</span>
					{state.kind === 'answered' && (
						<ChevronDown
							size={15}
							className={cn(
								'mt-1 text-muted-foreground transition-transform',
								focused && 'rotate-180',
							)}
						/>
					)}
				</button>
			</h3>
			{title !== question.text && (
				<details
					className="study-original mt-2 text-sm text-muted-foreground"
					hidden={!focused}
				>
					<summary className="w-fit cursor-pointer select-text">
						Original question
					</summary>
					<p className="mt-1.5 mb-0 whitespace-pre-wrap leading-relaxed wrap-anywhere">
						{question.text}
					</p>
				</details>
			)}
			<div id={answerId}>
				{state.kind === 'answered' && (
					<QuestionAnswer
						answer={state}
						expanded={focused}
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
			{source && (
				<>
					<a
						className="mt-3 flex min-w-0 max-w-full select-text items-center gap-1.5 text-left text-xs text-muted-foreground no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&[href]]:hover:text-primary"
						href={sourceHref}
						draggable={false}
						aria-label={
							sourceHref ? `Open source note: ${source.note}` : undefined
						}
						title={
							sourceHref
								? 'Open source note at the original passage'
								: undefined
						}
						onClick={(event) => {
							if (!sourceHref) return;
							event.preventDefault();
							if (!hasTextSelection(event.currentTarget))
								onOpenSource?.(source);
						}}
					>
						<FileText size={12} />
						<span className="min-w-0 truncate">{source.note}</span>
						{source.heading && (
							<span className="min-w-0 flex-1 truncate opacity-70">
								/ {source.heading}
							</span>
						)}
						{sourceHref && (
							<ArrowUpRight
								className="ml-auto opacity-70"
								size={12}
								aria-hidden="true"
							/>
						)}
					</a>
					{source.quote.trim() && (
						<div
							className="mt-1 text-xs text-muted-foreground"
							onClick={(event) => event.stopPropagation()}
						>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-auto gap-1 px-0 py-1 text-xs text-muted-foreground"
								aria-expanded={sourceOpen}
								aria-controls={sourceId}
								onClick={() => setSourceOpen(!sourceOpen)}
							>
								<ChevronDown
									size={10}
									className={cn(
										'transition-transform',
										sourceOpen && 'rotate-180',
									)}
									aria-hidden="true"
								/>
								Captured quote
							</Button>
							{sourceOpen && (
								<blockquote
									className="mx-0 mt-1.5 mb-0.5 rounded-r-md bg-background px-3 py-2 text-sm leading-relaxed wrap-anywhere shadow-[inset_2px_0_0_var(--primary)]"
									id={sourceId}
								>
									{source.quote}
								</blockquote>
							)}
						</div>
					)}
				</>
			)}
			<div className="mt-2 flex min-h-6 flex-wrap items-center gap-3">
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
				<div
					className="mt-3 animate-in fade-in-0 slide-in-from-top-1"
					hidden={!focused}
				>
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
		</article>
	);
}
