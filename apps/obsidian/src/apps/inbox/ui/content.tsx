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
import { Composer } from './composer.js';
import type { QuestionSubmission } from './composer.js';
import { QuestionFeed } from './feed.js';
import { selectionQuestion } from '../selection-question.js';
import type { InboxGroup } from '../hierarchy/types.js';
import type { ThoughtDump } from '../modes/types.js';
import type { InboxPreferences } from '../controller/types.js';
import type { QuestionNavigation } from './navigation.js';

type Props = {
	questions: StudyQuestion[];
	groups?: InboxGroup[];
	thoughtDumps?: ThoughtDump[];
	renderActions?: (question: StudyQuestion) => ReactNode;
	navigation?: QuestionNavigation;
	onFoldGroup?: (id: string, folded: boolean) => void;
	onRetryExtraction?: (id: string) => void;
	onDismissExtraction?: (id: string) => void;
	mode?: InboxPreferences['mode'];
	onThoughtDump?: (text: string) => void | Promise<void>;
	composerControls: ReactNode;
	concurrency: number;
	setConcurrency: (value: number) => void;
	onAdd: (submission: QuestionSubmission) => void | Promise<void>;
	onFollowUp: (
		submission: QuestionSubmission,
		parentId: string,
	) => void | Promise<void>;
	onDelete: (id: string) => void;
	onRetry: (id: string) => void;
	onOpenSource?: (source: QuestionSource) => void;
	onSettings?: () => void;
	footer?: ReactNode;
};

export function InboxContent({
	questions,
	groups,
	thoughtDumps,
	renderActions,
	navigation,
	onFoldGroup,
	onRetryExtraction,
	onDismissExtraction,
	mode = 'question',
	onThoughtDump,
	composerControls,
	concurrency,
	setConcurrency,
	onAdd,
	onFollowUp,
	onDelete,
	onRetry,
	onOpenSource,
	onSettings,
	footer,
}: Props) {
	const [optionsOpen, setOptionsOpen] = useState(false);
	const concurrencyId = useId();
	const splitting = mode === 'thought-dump' && !!onThoughtDump;
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
									Each question runs independently.
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
						label={splitting ? 'Thought dump' : 'Ask a question'}
						placeholder={
							splitting
								? 'Dump your thoughts and questions…'
								: 'Ask a question…'
						}
						submitLabel={splitting ? 'Organize questions' : undefined}
						controls={composerControls}
						normalizeText={splitting ? undefined : selectionQuestion}
						onSubmit={splitting ? ({ text }) => onThoughtDump(text) : onAdd}
					/>
				</div>
			</header>
			<QuestionFeed
				questions={questions}
				groups={groups}
				thoughtDumps={thoughtDumps}
				renderActions={renderActions}
				navigation={navigation}
				onFoldGroup={onFoldGroup}
				onRetryExtraction={onRetryExtraction}
				onDismissExtraction={onDismissExtraction}
				onFollowUp={onFollowUp}
				onDelete={onDelete}
				onRetry={onRetry}
				onOpenSource={onOpenSource}
			/>
			{footer}
		</main>
	);
}
