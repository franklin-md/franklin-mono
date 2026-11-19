import type { ThinkingLevel } from '@franklin/mini-acp';
import type { SingleFilePersister } from '@franklin/lib';
import type { StudyQuestion } from '../types.js';
import type { AnswerDetail } from '../answer/types.js';
import type { BranchContext, InboxGroup } from '../hierarchy/types.js';
import type { Extraction, SplitRequest, ThoughtDump } from '../modes/types.js';
import type {
	ActionRequest,
	InboxAction,
	InboxActionRun,
} from '../actions/types.js';

export type ModelSelection = {
	provider: string;
	model: string;
	reasoning: ThinkingLevel;
};

export type InboxQuestion = StudyQuestion &
	ModelSelection & {
		rootId: string;
		attemptId: string;
		updatedAt: number;
	};

export type InboxPreferences = ModelSelection & {
	answerInstructions: string;
	concurrency: number;
	mode?: 'question' | 'thought-dump';
};

export type InboxDocument = {
	questions: InboxQuestion[];
	groups?: InboxGroup[];
	thoughtDumps?: ThoughtDump[];
	actions: InboxAction[];
	actionRuns: InboxActionRun[];
	preferences: InboxPreferences;
};

export type InboxSnapshot = InboxDocument & { storageError?: string };

export type AnswerRequest = BranchContext & {
	question: InboxQuestion;
	signal: AbortSignal;
	submit: (
		answer: string,
		title?: string,
		details?: AnswerDetail[],
	) => Promise<void>;
	onTrace?: (trace: unknown) => void;
};

export type InboxControllerOptions = {
	persistence: SingleFilePersister<InboxDocument>;
	defaults: ModelSelection;
	// Development builds only: the agent inspect dump of each question's latest
	// settled attempt, for the card inspect button. Held in memory, never saved.
	traces?: Map<string, unknown>;
	run: (request: AnswerRequest) => Promise<void>;
	split?: (request: SplitRequest) => Promise<Extraction>;
	runAction?: (request: ActionRequest) => Promise<string>;
	onActionComplete?: (name: string, summary: string) => void;
};
