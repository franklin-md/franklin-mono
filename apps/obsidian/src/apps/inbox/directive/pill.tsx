import { useSyncExternalStore } from 'react';
import { Inbox, LoaderCircle, TriangleAlert } from 'lucide-react';
import { Button, cn } from '@franklin/ui';
import type { InboxController } from '../controller/index.js';
import type { InboxQuestionDirectiveState } from './types.js';
import { AnswerPreview } from './preview.js';
import { questionTitle } from '../title.js';
import { DirectivePill } from '../../../shared/directives/render/pill.js';
import { FailurePopover } from '../../../shared/ui/failure/popover.js';
import { RetryButton } from '../../../shared/ui/failure/retry.js';

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
						? 'Failed'
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
				kind === 'failed' && 'text-destructive',
			)}
		>
			<Button
				type="button"
				variant="ghost"
				disabled={!question}
				aria-label={
					kind === 'failed'
						? 'Question failed, open in Inbox'
						: `${label} in Inbox`
				}
				title={
					kind === 'answered' || kind === 'failed' ? undefined : question?.text
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
	if (question?.state.kind === 'failed')
		return (
			<FailurePopover
				message={question.state.error}
				stopCode={question.state.stopCode}
				actions={
					<>
						<RetryButton
							onClick={() => {
								void inbox.retry(state.questionId).catch(onError);
							}}
						/>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onOpen(state.questionId)}
						>
							Open in Inbox
						</Button>
					</>
				}
			>
				{pill}
			</FailurePopover>
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
