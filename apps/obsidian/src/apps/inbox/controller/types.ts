import type { ThinkingLevel } from '@franklin/mini-acp';
import type { SingleFilePersister } from '@franklin/lib';
import type { StudyQuestion } from '../types.js';
import type { AnswerDetail } from '../answer/types.js';

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
};

export type InboxDocument = {
	questions: InboxQuestion[];
	preferences: InboxPreferences;
};

export type InboxSnapshot = InboxDocument & { storageError?: string };

export type AnswerRequest = {
	question: InboxQuestion;
	ancestors: InboxQuestion[];
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
};
