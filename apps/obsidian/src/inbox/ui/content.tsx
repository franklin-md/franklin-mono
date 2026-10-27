import { Check, ChevronDown, Inbox, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { StudyQuestion, QuestionSource } from '../types.js';
import { Composer } from './composer.js';
import { QuestionFeed } from './feed.js';
import { selectionQuestion } from '../selection-question.js';

type Props = {
	questions: StudyQuestion[];
	models: { id: string; label: string }[];
	model: string;
	answerInstructions: string;
	concurrency: number;
	setModel: (value: string) => void;
	setConcurrency: (value: number) => void;
	onAdd: (text: string) => void | Promise<void>;
	onFollowUp: (text: string, parentId: string) => void | Promise<void>;
	onDelete: (id: string) => void;
	onRetry: (id: string) => void;
	onOpenSource?: (source: QuestionSource) => void;
	onSettings?: () => void;
	renderAnswer?: (answer: string) => ReactNode;
	renderActions?: (question: StudyQuestion) => ReactNode;
	actionActivity?: { running: number; queued: number };
	notice?: ReactNode;
	caption?: string;
};

export function InboxContent({
	questions,
	models,
	model,
	answerInstructions,
	concurrency,
	setModel,
	setConcurrency,
	onAdd,
	onFollowUp,
	onDelete,
	onRetry,
	onOpenSource,
	onSettings,
	renderAnswer,
	renderActions,
	actionActivity,
	notice,
	caption,
}: Props) {
	const [optionsOpen, setOptionsOpen] = useState(false);
	const running = questions.filter((q) => q.state.kind === 'running').length;
	const queued = questions.filter((q) => q.state.kind === 'queued').length;
	const answered = questions.filter((q) => q.state.kind === 'answered').length;
	return (
		<main className="study-inbox">
			<header className="study-header">
				<div className="study-heading-row">
					<div className="study-heading">
						<Inbox size={18} strokeWidth={1.6} />
						<h1>Inbox</h1>
						<span className="study-total">{questions.length}</span>
					</div>
					<button
						type="button"
						className="study-icon-button"
						aria-label="Inbox options"
						aria-expanded={optionsOpen}
						onClick={() => setOptionsOpen(!optionsOpen)}
					>
						<SlidersHorizontal size={16} />
					</button>
				</div>
				{optionsOpen && (
					<div className="study-options study-reveal">
						{onSettings && (
							<button
								type="button"
								className="study-text-button study-auth-settings"
								onClick={onSettings}
							>
								Settings and shortcuts
							</button>
						)}
						<label>
							<span>
								Questions at once
								<small>Each runs in its own conversation.</small>
							</span>
							<select
								aria-label="Concurrent questions"
								value={concurrency}
								onChange={(event) => setConcurrency(Number(event.target.value))}
							>
								{[1, 2, 3, 4].map((count) => (
									<option key={count} value={count}>
										{count}
									</option>
								))}
							</select>
						</label>
					</div>
				)}
				<div className="study-compose-area">
					<Composer onSubmit={(text) => onAdd(selectionQuestion(text))} />
					<div className="study-toolbar">
						<label className="study-model-select">
							<select
								aria-label="Model for new questions"
								value={model}
								onChange={(event) => setModel(event.target.value)}
							>
								{models.map((model) => (
									<option key={model.id} value={model.id}>
										{model.label}
									</option>
								))}
							</select>
							<ChevronDown size={11} />
						</label>
						{onSettings && (
							<button
								type="button"
								className="study-style-label"
								title={answerInstructions}
								onClick={onSettings}
							>
								Answer instructions
							</button>
						)}
						<span className="study-activity" role="status">
							{actionActivity &&
								actionActivity.running + actionActivity.queued > 0 && (
									<span>
										{actionActivity.running} actions · {actionActivity.queued}{' '}
										queued ·{' '}
									</span>
								)}
							{running > 0 ? (
								<>
									<i />
									{running} answering{queued > 0 && ` · ${queued} queued`}
								</>
							) : (
								<>
									<Check size={11} />
									{answered} answered
								</>
							)}
						</span>
					</div>
				</div>
			</header>
			{notice}
			<QuestionFeed
				questions={questions}
				onFollowUp={onFollowUp}
				onDelete={onDelete}
				onRetry={onRetry}
				onOpenSource={onOpenSource}
				renderAnswer={renderAnswer}
				renderActions={renderActions}
			/>
			{caption && <footer className="study-preview-caption">{caption}</footer>}
		</main>
	);
}
