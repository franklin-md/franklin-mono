import { useEffect, useRef, useSyncExternalStore } from 'react';
import { MODEL_CATALOG, Markdown } from '@franklin/ui';
import type { InboxController } from '../controller/controller.js';
import type { QuestionSource } from '../types.js';
import { InboxContent } from './content.js';
import { QuestionActions } from './actions.js';
import { ancestorsOf } from '../controller/lineage.js';
import { RecordButton } from '../capture/record-button.js';
import { CaptureStatus } from '../capture/status.js';
import './styles.css';
import './motion.css';
import './live.css';

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
	const models = MODEL_CATALOG.flatMap((group) =>
		group.models.map((model) => ({
			id: JSON.stringify([group.provider, model.id]),
			label: `${model.name} · ${group.displayName}`,
		})),
	);
	const selection = JSON.stringify([preferences.provider, preferences.model]);
	if (!models.some((model) => model.id === selection))
		models.unshift({
			id: selection,
			label: `${preferences.model} · ${preferences.provider}`,
		});
	const configure = (patch: Parameters<InboxController['configure']>[0]) => {
		void controller.configure(patch).catch(onError);
	};
	return (
		<div className="study-preview study-live" ref={container}>
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
						{capture && captureSnapshot && (
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
					</>
				)}
				models={models}
				model={selection}
				answerInstructions={preferences.answerInstructions}
				concurrency={preferences.concurrency}
				setModel={(value) => {
					const model = MODEL_CATALOG.flatMap((group) => group.models).find(
						(item) => JSON.stringify([item.provider, item.id]) === value,
					);
					if (model) configure({ provider: model.provider, model: model.id });
				}}
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
				renderAnswer={(answer) => <Markdown text={answer} />}
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
							<div className="study-save-error" role="alert">
								{snapshot.storageError}
								<button
									type="button"
									onClick={() => {
										void controller.retrySave().catch(onError);
									}}
								>
									Retry save
								</button>
							</div>
						) : undefined}
					</>
				}
			/>
		</div>
	);
}
