import type { ThinkingLevel } from '@franklin/mini-acp';
import type { SingleFilePersister } from '@franklin/lib';
import type { StudyQuestion } from '../types.js';
import type { AnswerDetail } from '../answer/types.js';
import type { BranchContext, InboxGroup } from '../hierarchy/types.js';
import type { Extraction, SplitRequest, ThoughtDump } from '../modes/types.js';

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
};

export type InboxControllerOptions = {
	persistence: SingleFilePersister<InboxDocument>;
	defaults: ModelSelection;
	run: (request: AnswerRequest) => Promise<void>;
	split?: (request: SplitRequest) => Promise<Extraction>;
};
