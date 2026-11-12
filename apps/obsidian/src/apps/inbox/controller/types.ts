import type { Extraction, ThoughtDump, SplitRequest } from '../modes/types.js';
import type { SingleFilePersister } from '@franklin/lib';
import type { StudyQuestion } from '../types.js';
import type { AnswerDetail } from '../answer/types.js';
import type { CaptureController } from '../capture/controller.js';
import type { EvidenceRepository } from '../evidence/types.js';
import type { BranchContext, InboxGroup } from '../hierarchy/types.js';
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
	mode?: 'question' | 'thought-dump';
};
export type InboxDocument = {
	questions: InboxQuestion[];
	groups?: InboxGroup[];
	thoughtDumps?: ThoughtDump[];
	preferences: InboxPreferences;
	actions: InboxAction[];
	actionRuns: InboxActionRun[];
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
};
export type InboxControllerOptions = {
	persistence: SingleFilePersister<InboxDocument>;
	defaults: ModelSelection;
	run: (request: AnswerRequest) => Promise<void>;
	split?: (request: SplitRequest) => Promise<Extraction>;
	runAction?: (request: ActionRequest) => Promise<string>;
	onActionComplete?: (name: string, summary: string) => void;
	capture?: CaptureController;
	evidence?: EvidenceRepository;
};
