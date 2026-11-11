import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
	Button,
	Markdown,
	ModelPicker,
	PromptFooterControlGroup,
} from '@franklin/ui';
import { questionSchema } from '../controller/question-schema.js';
import type { InboxController } from '../controller/controller.js';
import type { QuestionSource } from '../types.js';
import { InboxContent } from './content.js';
import { QuestionActions } from './actions.js';
import { ancestorsOf } from '../controller/lineage.js';
import { RecordButton } from '../capture/record-button.js';
import { CaptureStatus } from '../capture/status.js';
import { DebugButton } from '../debug/button.js';
import './styles.css';

type Props = {
	controller: InboxController;
	onOpenSource: (source: QuestionSource) => void;
	captureContext?: (question: string) => Promise<QuestionSource | undefined>;
	onSettings: () => void;
	onError: (error: unknown) => void;
};

export function InboxPanel({
	controller,
	captureContext,
	onOpenSource,
	onSettings,
	onError,
}: Props) {
	const subscribe = (notify: () => void) => controller.state.subscribe(notify);
	const snapshot = useSyncExternalStore(subscribe, () =>
		controller.state.get(),
	);
	const capture = controller.capture;
	const captureSnapshot = useSyncExternalStore(
		(notify) => capture?.state.subscribe(notify) ?? (() => {}),
		() => capture?.state.get(),
	);
	const container = useRef<HTMLDivElement>(null);
	const newest = snapshot.questions.filter((q) => !q.parentId).at(0)?.id;
	useEffect(() => {
		container.current?.querySelector('.study-feed')?.scrollTo({ top: 0 });
	}, [newest]);
	const { preferences } = snapshot;
	const configure = (patch: Parameters<InboxController['configure']>[0]) => {
		void controller.configure(patch).catch(onError);
	};
	return (
		<div
			className="h-full min-h-0 w-full overflow-hidden text-left font-sans text-sm leading-normal text-foreground"
			ref={container}
		>
			<InboxContent
				questions={snapshot.questions}
				actionActivity={{
					running: snapshot.actionRuns.filter(
						(run) => run.state.kind === 'running',
					).length,
					queued: snapshot.actionRuns.filter(
						(run) => run.state.kind === 'queued',
					).length,
				}}
				renderActions={(question) => (
					<>
						{question.state.kind === 'answered' &&
							capture &&
							captureSnapshot && (
								<RecordButton
									snapshot={captureSnapshot}
									questionId={question.id}
									onStop={() => {
										void capture.stop().catch(onError);
									}}
									onRecord={() => {
										const fullQuestion = snapshot.questions.find(
											(item) => item.id === question.id,
										);
										if (fullQuestion)
											void capture
												.start(
													fullQuestion,
													ancestorsOf(fullQuestion, snapshot.questions),
												)
												.catch(onError);
									}}
								/>
							)}
						{question.state.kind === 'answered' && (
							<QuestionActions
								actions={snapshot.actions}
								runs={snapshot.actionRuns.filter(
									(run) => run.question.id === question.id,
								)}
								onRun={(actionId) => {
									void controller.actions
										.start(question.id, actionId)
										.catch(onError);
								}}
								onRetry={(id) => {
									void controller.actions.retry(id).catch(onError);
								}}
								onDismiss={(id) => {
									void controller.actions.dismiss(id).catch(onError);
								}}
							/>
						)}
						<DebugButton
							load={() => controller.debug(question.id)}
							onError={onError}
						/>
					</>
				)}
				composerControls={
					<PromptFooterControlGroup className="min-w-0 flex-wrap gap-1">
						<ModelPicker
							provider={preferences.provider}
							model={preferences.model}
							label="Model for new questions"
							onSelect={(provider, model) => configure({ provider, model })}
							effort={{
								level: preferences.reasoning,
								levels: questionSchema.shape.reasoning.options,
								onChange: (reasoning) => configure({ reasoning }),
							}}
						/>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="hidden h-auto px-2 py-1 text-xs text-muted-foreground @min-[380px]:inline-flex"
							title={preferences.answerInstructions}
							onClick={onSettings}
						>
							Answer instructions
						</Button>
					</PromptFooterControlGroup>
				}
				concurrency={preferences.concurrency}
				setConcurrency={(concurrency) => configure({ concurrency })}
				onAdd={async (text) => {
					await controller.add(text, undefined, await captureContext?.(text));
				}}
				onFollowUp={async (text, id) => {
					await controller.add(text, id);
				}}
				onDelete={(id) => {
					void controller.remove(id).catch(onError);
				}}
				onRetry={(id) => {
					void controller.retry(id).catch(onError);
				}}
				onOpenSource={onOpenSource}
				onSettings={onSettings}
				renderAnswer={(answer) => (
					<Markdown
						text={answer}
						className="prose-content text-inherit leading-[inherit]"
					/>
				)}
				notice={
					<>
						{capture && captureSnapshot && (
							<CaptureStatus
								controller={capture}
								snapshot={captureSnapshot}
								onError={onError}
							/>
						)}
						{snapshot.storageError ? (
							<div
								className="mx-4 mb-3 shrink-0 rounded-md bg-muted p-3 text-xs wrap-anywhere text-[var(--text-error)] @min-[380px]:mx-6"
								role="alert"
							>
								{snapshot.storageError}
								<Button
									type="button"
									variant="link"
									size="sm"
									className="mt-1 block h-auto px-0 text-xs"
									onClick={() => {
										void controller.retrySave().catch(onError);
									}}
								>
									Retry save
								</Button>
							</div>
						) : undefined}
					</>
				}
			/>
		</div>
	);
}
