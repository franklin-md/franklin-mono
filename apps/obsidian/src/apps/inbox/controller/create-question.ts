import type { InboxPreferences, InboxQuestion } from './types.js';
import type { QuestionSource } from '../types.js';
import type { InboxNode } from '../hierarchy/types.js';

type Options = {
	text: string;
	preferences: Omit<InboxPreferences, 'concurrency'>;
	source?: QuestionSource;
	parent?: InboxNode;
};

export function createQuestion({
	text,
	preferences,
	source,
	parent,
}: Options): InboxQuestion {
	const id = crypto.randomUUID();
	const now = Date.now();
	return {
		id,
		rootId: parent?.rootId ?? id,
		parentId: parent?.id,
		text: text.trim(),
		createdAt: now,
		updatedAt: now,
		attemptId: crypto.randomUUID(),
		model: preferences.model,
		provider: preferences.provider,
		reasoning: preferences.reasoning,
		answerInstructions: preferences.answerInstructions,
		source: source ?? parent?.source,
		state: { kind: 'queued' },
	};
}
