import { useSyncExternalStore } from 'react';
import type { ReadonlyStore } from '@franklin/agent';
import { THINKING_LEVELS } from '@franklin/mini-acp';
import {
	Button,
	CopyDumpButton,
	ModelPicker,
	PromptFooterControlGroup,
} from '@franklin/ui';
import type { InboxController } from '../controller/index.js';
import type { InboxSettings } from '../controller/types.js';
import type { QuestionSource, StudyQuestion } from '../types.js';
import { InboxContent } from './content.js';
import { ModeControl } from './mode.js';
import { QuestionActions } from './actions.js';
import type { QuestionNavigation } from './navigation.js';

type Props = {
	controller: InboxController;
	navigation?: ReadonlyStore<QuestionNavigation | null>;
	onOpenSource: (source: QuestionSource) => void;
	captureContext?: (question: string) => Promise<QuestionSource | undefined>;
	onSettings: () => void;
	onError: (error: unknown) => void;
};

export function InboxPanel({
	controller,
	navigation,
	captureContext,
	onOpenSource,
	onSettings,
	onError,
}: Props) {
	const snapshot = useSyncExternalStore(
		(notify) => controller.state.subscribe(notify),
		() => controller.state.get(),
	);
	const traces = controller.traces;
	const settings = useSyncExternalStore(
		controller.settings.subscribe,
		controller.settings.get,
	);
	const navigationRequest = useSyncExternalStore(
		(notify) => navigation?.subscribe(notify) ?? (() => {}),
		() => navigation?.get() ?? undefined,
	);
	const configure = (update: Partial<InboxSettings>) => {
		void controller.settings.configure(update).catch(onError);
	};
	async function submitThoughtDump(text: string): Promise<void> {
		// Extract with the settings shown when the dump was submitted.
		const current = controller.settings.get();
		await controller.thoughtDumps.add(
			text,
			await captureContext?.(text),
			current,
		);
	}

	function renderActions(question: StudyQuestion) {
		if (question.state.kind !== 'answered') return null;
		const runs = snapshot.actionRuns.filter(
			(run) => run.question.id === question.id,
		);
		if (!settings.actions.length && !runs.length) return null;
		return (
			<QuestionActions
				actions={settings.actions}
				runs={runs}
				onRun={(actionId) => {
					void controller.actions.start(question.id, actionId).catch(onError);
				}}
				onRetry={(id) => {
					void controller.actions.retry(id).catch(onError);
				}}
				onDismiss={(id) => {
					void controller.actions.dismiss(id).catch(onError);
				}}
			/>
		);
	}

	return (
		<div className="h-full min-h-0 w-full overflow-hidden text-left font-sans text-sm leading-normal text-foreground">
			<InboxContent
				questions={snapshot.questions}
				groups={snapshot.groups}
				navigation={navigationRequest}
				renderActions={(question) => (
					<>
						{renderActions(question)}
						{traces && (
							<CopyDumpButton
								load={() => findTrace(traces, question.id)}
								onCopyError={onError}
							/>
						)}
					</>
				)}
				onFoldGroup={(id, folded) => {
					void controller.groups.fold(id, folded).catch(onError);
				}}
				mode={settings.mode}
				onThoughtDump={submitThoughtDump}
				thoughtDumps={snapshot.thoughtDumps}
				onRetryExtraction={(id) => {
					void controller.thoughtDumps.retry(id).catch(onError);
				}}
				onDismissExtraction={(id) => {
					void controller.thoughtDumps.dismiss(id).catch(onError);
				}}
				composerControls={
					<PromptFooterControlGroup className="min-w-0 flex-wrap gap-1">
						<ModelPicker
							value={{
								provider: settings.provider,
								model: settings.model,
							}}
							label="Model for new questions"
							onChange={configure}
							effort={{
								value: settings.reasoning,
								levels: THINKING_LEVELS,
								onChange: (reasoning) => configure({ reasoning }),
							}}
						/>
						<ModeControl
							mode={settings.mode}
							onChange={(mode) => configure({ mode })}
						/>
					</PromptFooterControlGroup>
				}
				concurrency={settings.concurrency}
				setConcurrency={(concurrency) => configure({ concurrency })}
				onAdd={async ({ id, text }) => {
					const isRetry = controller.state
						.get()
						.questions.some((q) => q.id === id);
					const source = isRetry ? undefined : await captureContext?.(text);
					await controller.add(text, { id, source });
				}}
				onFollowUp={async ({ id, text }, parentId) => {
					await controller.add(text, { id, parentId });
				}}
				onDelete={(id) => {
					void controller.remove(id).catch(onError);
				}}
				onRetry={(id) => {
					void controller.retry(id).catch(onError);
				}}
				onOpenSource={onOpenSource}
				onSettings={onSettings}
				footer={
					snapshot.storageError && (
						<div
							className="mx-4 mb-3 max-h-[30%] shrink-0 overflow-y-auto rounded-md bg-muted p-3 text-xs wrap-anywhere text-[var(--text-error)] @min-[380px]:mx-6"
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
					)
				}
			/>
		</div>
	);
}

async function findTrace(
	traces: ReadonlyMap<string, unknown>,
	questionId: string,
): Promise<unknown> {
	const trace = traces.get(questionId);
	if (trace === undefined)
		throw new Error('No agent trace has been recorded for this question yet');
	return trace;
}
