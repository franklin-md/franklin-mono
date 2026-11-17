import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { ReadonlyStore } from '@franklin/agent';
import {
	Button,
	Markdown,
	ModelPicker,
	PromptFooterControlGroup,
} from '@franklin/ui';
import type { QuestionNavigation } from './navigation.js';
import { questionSchema } from '../controller/question-schema.js';
import type { InboxController } from '../controller/index.js';
import type { QuestionSource } from '../types.js';
import { InboxContent } from './content.js';

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
	const navigationRequest = useSyncExternalStore(
		(notify) => navigation?.subscribe(notify) ?? (() => {}),
		() => navigation?.get() ?? undefined,
	);
	const container = useRef<HTMLDivElement>(null);
	const newest = snapshot.questions.find((question) => !question.parentId)?.id;
	useEffect(() => {
		if (!navigationRequest)
			container.current?.querySelector('.study-feed')?.scrollTo({ top: 0 });
	}, [newest, navigationRequest]);
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
				navigation={navigationRequest}
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
						sanitize={{ protocols: { href: ['obsidian'] } }}
						className="prose-content text-inherit leading-[inherit]"
					/>
				)}
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
