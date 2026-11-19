import type { ModelSelection } from '../../../shared/model/selection.js';
import type { z } from 'zod';
import type { InboxQuestion } from '../controller/types.js';
import type { BranchContext } from '../hierarchy/types.js';
import type { FailedState } from '../types.js';
import type { inboxActionSchema } from './schema.js';

// A prompt preset whose name fits on one action button line.
export type InboxAction = z.infer<typeof inboxActionSchema>;

export type QueuedAction = { kind: 'queued' };
export type RunningAction = { kind: 'running' };
export type SucceededAction = { kind: 'succeeded'; summary: string };
export type ActionState =
	| QueuedAction
	| RunningAction
	| FailedState
	| SucceededAction;

export type InboxActionRun = ModelSelection &
	BranchContext & {
		id: string;
		attemptId: string;
		action: InboxAction;
		question: InboxQuestion;
		createdAt: number;
		state: ActionState;
	};

export type ActionRequest = {
	run: InboxActionRun;
	signal: AbortSignal;
};
