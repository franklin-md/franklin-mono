import { useSyncExternalStore } from 'react';
import { Inbox, LoaderCircle, TriangleAlert } from 'lucide-react';
import { Button, cn } from '@franklin/ui';
import type { InboxController } from '../controller/controller.js';
import type { InboxQuestionDirectiveState } from './types.js';
import { AnswerPreview } from './preview.js';
import { questionTitle } from '../title.js';
import { DirectivePill } from '../../../shared/directives/render/pill.js';

type Props = {
	state: InboxQuestionDirectiveState;
	inbox: InboxController;
	onOpen: (questionId: string) => void;
	onError: (error: unknown) => void;
};

export function InboxQuestionPill({ state, inbox, onOpen, onError }: Props) {
	const question = useSyncExternalStore(
		(notify) => inbox.state.subscribe(notify),
		() =>
			inbox.state
				.get()
				.questions.find((question) => question.id === state.questionId),
	);
	const kind = question?.state.kind;
	const label =
		kind === 'answered'
			? 'View answer'
			: kind === 'running'
				? 'Thinking'
				: kind === 'queued'
					? 'Queued'
					: kind === 'failed'
						? 'Open question'
						: 'Question deleted';
	const Icon =
		kind === 'running'
			? LoaderCircle
			: kind === 'failed'
				? TriangleAlert
				: Inbox;
	const pill = (
		<DirectivePill
			asChild
			className={cn(
				'mx-1 ring-1 ring-inset ring-border',
				kind === 'answered' &&
					'bg-primary/15 text-primary ring-primary/50 hover:bg-primary/25 hover:text-primary',
				kind === 'failed' && 'text-[var(--text-error)]',
			)}
		>
			<Button
				type="button"
				variant="ghost"
				disabled={!question}
				aria-label={`${label} in Inbox`}
				title={
					question?.state.kind === 'failed'
						? question.state.error
						: kind === 'answered'
							? undefined
							: question?.text
				}
				onClick={() => onOpen(state.questionId)}
			>
				<Icon
					aria-hidden="true"
					className={cn(
						kind === 'running' && 'animate-spin motion-reduce:animate-none',
					)}
				/>
				<span aria-live="polite">{label}</span>
			</Button>
		</DirectivePill>
	);
	return question?.state.kind === 'answered' ? (
		<AnswerPreview
			answer={question.state}
			title={questionTitle(question)}
			onOpen={() => onOpen(state.questionId)}
			onDelete={() => {
				void inbox.remove(state.questionId).catch(onError);
			}}
		>
			{pill}
		</AnswerPreview>
	) : (
		pill
	);
}
