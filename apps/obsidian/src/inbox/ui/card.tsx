import {
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
import { useId, useState } from 'react';

import { Composer } from './composer.js';
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
			className={`study-question study-question-${state.kind}${focused ? ' study-question-focused' : ''}`}
			onClick={(event) => {
				// A selection drag must stay a selection, and controls own their clicks.
				if (
					event.currentTarget.ownerDocument.getSelection()?.isCollapsed ===
					false
				)
					return;
				if (
					event.target instanceof Element &&
					event.target.closest(
						'button, a, input, textarea, select, pre, summary',
					)
				)
					return;
				onFocus(focused ? undefined : question.id);
			}}
			aria-labelledby={titleId}
		>
			{parent && (
				<button
					type="button"
					className="study-parent"
					onClick={(event) => {
						onFocus(parent.id);
						event.currentTarget.ownerDocument
							.getElementById(`question-${parent.id}`)
							?.scrollIntoView({ block: 'start' });
					}}
				>
					<GitBranch size={12} />
					<span>Follow-up to {questionTitle(parent)}</span>
				</button>
			)}
			<div className="study-question-meta">
				<span className="study-status">
					<StatusIcon
						size={12}
						className={state.kind === 'running' ? 'study-spin' : ''}
					/>
					{label}
				</span>
				<time dateTime={new Date(question.createdAt).toISOString()}>
					{timeFormat.format(question.createdAt)}
				</time>
				<button
					type="button"
					className="study-icon-button study-delete"
					aria-label={`Delete question: ${title}`}
					title={
						childCount
							? 'Delete question and its follow-ups'
							: 'Delete question'
					}
					onClick={() => onDelete(question.id)}
				>
					<Trash2 size={13} />
				</button>
			</div>
			<h3 id={titleId}>
				<button
					type="button"
					className="study-question-title"
					aria-expanded={focused}
					aria-controls={answerId}
					disabled={state.kind !== 'answered'}
					onClick={() => onFocus(focused ? undefined : question.id)}
				>
					<span>{title}</span>
					{state.kind === 'answered' && (
						<ChevronDown
							size={15}
							className={focused ? 'study-chevron-open' : ''}
						/>
					)}
				</button>
			</h3>
			{title !== question.text && (
				<details className="study-original" hidden={!focused}>
					<summary>Original question</summary>
					<p>{question.text}</p>
				</details>
			)}
			<div id={answerId}>
				{state.kind === 'answered' && (
					<div
						className={`study-answer ${focused ? 'study-answer-expanded' : ''}`}
					>
						{renderAnswer ? renderAnswer(state.answer) : <p>{state.answer}</p>}
					</div>
				)}
				{active && (
					<div className="study-pending" role="status">
						{state.kind === 'running' ? (
							<>
								<span className="study-dots">
									<i />
									<i />
									<i />
								</span>
								<span>Preparing an answer…</span>
							</>
						) : (
							'Waiting to start…'
						)}
					</div>
				)}
				{state.kind === 'failed' && (
					<p className="study-error">{state.error}</p>
				)}
			</div>
			{source && (
				<button
					type="button"
					className="study-source"
					aria-expanded={sourceOpen}
					aria-controls={sourceId}
					onClick={() => setSourceOpen(!sourceOpen)}
				>
					<FileText size={12} />
					<span>{source.note}</span>
					{source.heading && (
						<span className="study-source-heading">/ {source.heading}</span>
					)}
				</button>
			)}
			{source && sourceOpen && (
				<>
					<blockquote className="study-source-quote study-reveal" id={sourceId}>
						{source.quote}
					</blockquote>
					{onOpenSource && source.location && (
						<button
							type="button"
							className="study-text-button study-open-source"
							onClick={() => onOpenSource(source)}
						>
							Open source note
						</button>
					)}
				</>
			)}
			<div className="study-question-footer">
				{state.kind === 'answered' && actions}
				{state.kind === 'failed' && (
					<button
						type="button"
						className="study-text-button study-retry"
						onClick={() => onRetry(question.id)}
					>
						<RotateCcw size={12} />
						Retry
					</button>
				)}
			</div>
			{state.kind === 'answered' && (
				<div className="study-followup study-reveal" hidden={!focused}>
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
