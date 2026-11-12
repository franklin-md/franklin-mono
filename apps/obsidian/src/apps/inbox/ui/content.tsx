import { Inbox, SlidersHorizontal } from 'lucide-react';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import {
	Badge,
	Button,
	IconButton,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@franklin/ui';
import type { StudyQuestion, QuestionSource } from '../types.js';
import type { InboxPreferences } from '../controller/types.js';
import { Composer } from './composer.js';
import { QuestionFeed } from './feed.js';
import type { QuestionNavigation } from './navigation.js';
import { selectionQuestion } from '../selection-question.js';
import type { InboxGroup } from '../hierarchy/types.js';
import type { ThoughtDump } from '../modes/types.js';

type Props = {
	questions: StudyQuestion[];
	groups?: InboxGroup[];
	thoughtDumps?: ThoughtDump[];
	onRetryExtraction?: (id: string) => void;
	onDismissExtraction?: (id: string) => void;
	onFoldGroup?: (id: string, folded: boolean) => void;
	navigation?: QuestionNavigation;
	composerControls: ReactNode;
	mode?: InboxPreferences['mode'];
	onThoughtDump?: (text: string) => void | Promise<void>;
	concurrency: number;
	setConcurrency: (value: number) => void;
	onAdd: (text: string) => void | Promise<void>;
	onFollowUp: (text: string, parentId: string) => void | Promise<void>;
	onDelete: (id: string) => void;
	onRetry: (id: string) => void;
	onOpenSource?: (source: QuestionSource) => void;
	onSettings?: () => void;
	renderAnswer?: (answer: string) => ReactNode;
	renderActions?: (question: StudyQuestion) => ReactNode;
	footer?: ReactNode;
};

export function InboxContent({
	questions,
	groups,
	thoughtDumps,
	onRetryExtraction,
	onDismissExtraction,
	onFoldGroup,
	navigation,
	composerControls,
	mode = 'question',
	onThoughtDump,
	concurrency,
	setConcurrency,
	onAdd,
	onFollowUp,
	onDelete,
	onRetry,
	onOpenSource,
	onSettings,
	renderAnswer,
	renderActions,
	footer,
}: Props) {
	const [optionsOpen, setOptionsOpen] = useState(false);
	const concurrencyId = useId();
	return (
		<main className="study-inbox @container flex h-full min-h-0 min-w-0 flex-col bg-background">
			<header className="study-header relative z-1 shrink-0 px-4 pt-6 @min-[380px]:px-6">
				<div className="mb-6 flex items-center justify-between gap-2.5">
					<div className="flex items-center gap-2.5">
						<Inbox
							size={18}
							strokeWidth={1.6}
							className="text-muted-foreground"
						/>
						<h1 className="m-0 text-lg font-semibold tracking-tight">Inbox</h1>
						<Badge variant="secondary" className="border-0">
							{questions.length}
						</Badge>
					</div>
					<IconButton
						icon={SlidersHorizontal}
						type="button"
						aria-label="Inbox options"
						aria-expanded={optionsOpen}
						onClick={() => setOptionsOpen(!optionsOpen)}
					/>
				</div>
				{optionsOpen && (
					<div className="mb-4 rounded-lg bg-muted p-3 ring-1 ring-inset ring-border animate-in fade-in-0 slide-in-from-top-1">
						{onSettings && (
							<Button
								variant="ghost"
								size="sm"
								type="button"
								className="mb-4"
								onClick={onSettings}
							>
								Settings and shortcuts
							</Button>
						)}
						<div className="flex items-center justify-between gap-3">
							<div className="min-w-0">
								<Label htmlFor={concurrencyId}>Questions at once</Label>
								<p className="mt-1 mb-0 text-xs text-muted-foreground">
									Each runs in its own conversation.
								</p>
							</div>
							<Select
								value={String(concurrency)}
								onValueChange={(value) => setConcurrency(Number(value))}
							>
								<SelectTrigger
									id={concurrencyId}
									aria-label="Concurrent questions"
									className="w-16 shrink-0 border-0 ring-1 ring-inset ring-input"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{[1, 2, 3, 4].map((count) => (
										<SelectItem key={count} value={String(count)}>
											{count}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				)}
				<div className="mb-6">
					<Composer
						label={mode === 'thought-dump' ? 'Thought dump' : 'Ask a question'}
						placeholder={
							mode === 'thought-dump'
								? 'Dump your thoughts and questions…'
								: 'Ask a question…'
						}
						controls={composerControls}
						onSubmit={(text) =>
							mode === 'thought-dump' && onThoughtDump
								? onThoughtDump(text)
								: onAdd(selectionQuestion(text))
						}
					/>
				</div>
			</header>
			<QuestionFeed
				questions={questions}
				groups={groups}
				thoughtDumps={thoughtDumps}
				onRetryExtraction={onRetryExtraction}
				onDismissExtraction={onDismissExtraction}
				onFoldGroup={onFoldGroup}
				navigation={navigation}
				onFollowUp={onFollowUp}
				onDelete={onDelete}
				onRetry={onRetry}
				onOpenSource={onOpenSource}
				renderAnswer={renderAnswer}
				renderActions={renderActions}
			/>
			{footer}
		</main>
	);
}
