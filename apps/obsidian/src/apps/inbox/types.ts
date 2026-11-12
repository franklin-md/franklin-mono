import type { AnswerDetail } from './answer/types.js';

export type SourcePosition = { line: number; ch: number };

export type SourceLocation = {
	id: string;
	path: string;
	from: SourcePosition;
	to: SourcePosition;
	context: string;
	capturedAt: number;
};

export type QuestionSource = {
	location?: SourceLocation;
	note: string;
	heading: string;
	outline?: string[];
	quote: string;
};

export type QueuedQuestion = { kind: 'queued' };
export type RunningQuestion = { kind: 'running' };
export type AnsweredQuestion = {
	kind: 'answered';
	answer: string;
	title?: string;
	details?: AnswerDetail[];
};
export type FailedQuestion = { kind: 'failed'; error: string };
export type QuestionState =
	| QueuedQuestion
	| RunningQuestion
	| AnsweredQuestion
	| FailedQuestion;

export type StudyQuestion = {
	id: string;
	order?: number;
	parentId?: string;
	text: string;
	createdAt: number;
	model: string;
	modelLabel?: string;
	answerInstructions: string;
	source?: QuestionSource;
	state: QuestionState;
};
