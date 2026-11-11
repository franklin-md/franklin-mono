import type { InboxQuestion } from '../controller/types.js';
import type { QuestionSource } from '../types.js';

export type GroupInput = {
	title?: string;
	context?: string;
	source?: QuestionSource;
};

export type InboxGroup = GroupInput & {
	kind: 'group';
	id: string;
	order?: number;
	parentId?: string;
	rootId: string;
	createdAt: number;
	folded: boolean;
};

export type InboxNode = InboxQuestion | InboxGroup;
export type NewGroup = GroupInput & { kind: 'group' };
export type NewQuestion = {
	kind: 'question';
	text: string;
	source?: QuestionSource;
};
export type NewChild = NewGroup | NewQuestion;
export type BranchContext = {
	ancestors: InboxQuestion[];
	groups?: InboxGroup[];
};
