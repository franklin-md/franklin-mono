import { useSyncExternalStore } from 'react';
import { Button, ModelPicker, PromptFooterControlGroup } from '@franklin/ui';
import { questionSchema } from '../controller/question-schema.js';
import type { InboxController } from '../controller/index.js';
import type { QuestionSource } from '../types.js';
import { InboxContent } from './content.js';
import { ModeControl } from './mode.js';

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
	const snapshot = useSyncExternalStore(
		(notify) => controller.state.subscribe(notify),
		() => controller.state.get(),
	);
	const { preferences } = snapshot;
	const configure = (patch: Parameters<InboxController['configure']>[0]) => {
		void controller.configure(patch).catch(onError);
	};
	async function submitThoughtDump(text: string): Promise<void> {
		const preferences = { ...controller.state.get().preferences };
		await controller.thoughtDumps.add(
			text,
			await captureContext?.(text),
			preferences,
		);
	}

	return (
		<div className="h-full min-h-0 w-full overflow-hidden text-left font-sans text-sm leading-normal text-foreground">
			<InboxContent
				questions={snapshot.questions}
				groups={snapshot.groups}
				onFoldGroup={(id, folded) => {
					void controller.groups.fold(id, folded).catch(onError);
				}}
				mode={preferences.mode}
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
						<ModeControl
							mode={preferences.mode}
							onChange={(mode) => configure({ mode })}
						/>
					</PromptFooterControlGroup>
				}
				concurrency={preferences.concurrency}
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
