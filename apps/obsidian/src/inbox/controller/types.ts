import type { SingleFilePersister } from '@franklin/lib';
import type { StudyQuestion } from '../types.js';
import type { CaptureController } from '../capture/controller.js';
import type {
	ActionRequest,
	InboxAction,
	InboxActionRun,
} from '../actions/types.js';

export type ModelSelection = {
	provider: string;
	model: string;
	reasoning: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
};
export type InboxQuestion = StudyQuestion & {
	provider: string;
	reasoning: ModelSelection['reasoning'];
	rootId: string;
	attemptId: string;
	updatedAt: number;
};
export type InboxPreferences = ModelSelection & {
	answerInstructions: string;
	concurrency: number;
};
export type InboxDocument = {
	questions: InboxQuestion[];
	preferences: InboxPreferences;
	actions: InboxAction[];
	actionRuns: InboxActionRun[];
};
export type InboxSnapshot = InboxDocument & { storageError?: string };
export type AnswerRequest = {
	question: InboxQuestion;
	ancestors: InboxQuestion[];
	signal: AbortSignal;
	submit: (answer: string, title?: string) => Promise<void>;
};
export type InboxControllerOptions = {
	persistence: SingleFilePersister<InboxDocument>;
	defaults: ModelSelection;
	run: (request: AnswerRequest) => Promise<void>;
	runAction?: (request: ActionRequest) => Promise<string>;
	onActionComplete?: (name: string, summary: string) => void;
	capture?: CaptureController;
};
