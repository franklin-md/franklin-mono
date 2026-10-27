import type { InboxQuestion, ModelSelection } from '../controller/types.js';

export type InboxAction = {
	id: string;
	name: string;
	prompt: string;
};

export type QueuedAction = { kind: 'queued' };
export type RunningAction = { kind: 'running' };
export type FailedAction = { kind: 'failed'; error: string };
export type SucceededAction = { kind: 'succeeded'; summary: string };
export type ActionState =
	| QueuedAction
	| RunningAction
	| FailedAction
	| SucceededAction;

export type InboxActionRun = ModelSelection & {
	id: string;
	attemptId: string;
	action: InboxAction;
	question: InboxQuestion;
	ancestors: InboxQuestion[];
	createdAt: number;
	state: ActionState;
};

export type ActionRequest = {
	run: InboxActionRun;
	signal: AbortSignal;
};
