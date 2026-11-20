import type { ModelSelection } from '../../../shared/model/selection.js';
import type { InboxQuestion } from './types.js';
import type { QuestionSource } from '../types.js';
import type { InboxNode } from '../hierarchy/types.js';

type Options = {
	id?: string;
	text: string;
	settings: ModelSelection & { answerInstructions: string };
	source?: QuestionSource;
	parent?: InboxNode;
};

export function createQuestion({
	id = crypto.randomUUID(),
	text,
	settings,
	source,
	parent,
}: Options): InboxQuestion {
	const now = Date.now();
	return {
		id,
		rootId: parent?.rootId ?? id,
		parentId: parent?.id,
		text,
		createdAt: now,
		updatedAt: now,
		attemptId: crypto.randomUUID(),
		model: settings.model,
		provider: settings.provider,
		reasoning: settings.reasoning,
		answerInstructions: settings.answerInstructions,
		source: source ?? parent?.source,
		state: { kind: 'queued' },
	};
}
