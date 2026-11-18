import { versioned, zodCodec } from '@franklin/lib';
import { z } from 'zod';
import { questionSchema } from './question-schema.js';
import { migrateAnswerInstructions } from './migrate-instructions.js';
import type { InboxDocument } from './types.js';

const preferences = z.object({
	provider: z.string().min(1),
	model: z.string().min(1),
	reasoning: questionSchema.shape.reasoning,
	answerInstructions: z.string(),
	concurrency: z.number().int().min(1).max(4),
	mode: z.literal('question').optional(),
});
const legacyQuestion = questionSchema
	.omit({ answerInstructions: true })
	.extend({ terse: z.boolean() });
const legacyPreferences = preferences
	.omit({ answerInstructions: true })
	.extend({ terse: z.boolean() });

function validateLineage(
	{
		questions,
	}: { questions: { id: string; rootId: string; parentId?: string }[] },
	ctx: z.RefinementCtx,
) {
	const byId = new Map(questions.map((question) => [question.id, question]));
	if (byId.size !== questions.length)
		ctx.addIssue({ code: 'custom', message: 'Duplicate question IDs' });
	for (const question of questions) {
		let current = question;
		const visited = new Set([question.id]);
		while (current.parentId) {
			const parent = byId.get(current.parentId);
			if (!parent || visited.has(parent.id)) {
				ctx.addIssue({ code: 'custom', message: 'Invalid question lineage' });
				break;
			}
			visited.add(parent.id);
			current = parent;
		}
		if (current.rootId !== current.id || question.rootId !== current.id)
			ctx.addIssue({ code: 'custom', message: 'Invalid root question' });
	}
}

// Madrid's v1–v6 envelopes may contain later features. Accept empty collections
// for flat-question compatibility, but never let Zod strip nonempty records.
// This also protects a file whose declared version predates its actual contents.
const emptyCollections = {
	groups: z.array(z.never()).optional(),
	actions: z.array(z.never()).optional(),
	actionRuns: z.array(z.never()).optional(),
	thoughtDumps: z.array(z.never()).optional(),
};
const legacyDocument = z
	.strictObject({
		questions: z.array(legacyQuestion),
		preferences: legacyPreferences,
		...emptyCollections,
	})
	.superRefine(validateLineage)
	.transform(({ questions, preferences }) => ({ questions, preferences }));
const document: z.ZodType<InboxDocument> = z
	.strictObject({
		questions: z.array(questionSchema),
		preferences,
		...emptyCollections,
	})
	.superRefine(validateLineage)
	.transform(({ questions, preferences }) => ({ questions, preferences }));

export const inboxCodec = versioned()
	.version(1, zodCodec(legacyDocument))
	.version(2, zodCodec(legacyDocument), (previous) => previous)
	.version(3, zodCodec(document), (previous) => ({
		preferences: migrateAnswerInstructions(previous.preferences),
		questions: previous.questions.map(migrateAnswerInstructions),
	}))
	.version(4, zodCodec(document), (previous) => previous)
	.version(5, zodCodec(document), (previous) => previous)
	.version(6, zodCodec(document), (previous) => previous)
	// Version 7 identifies the base-only writer. Older plugins must reject it
	// rather than assume their group/action fields exist in this document.
	.version(7, zodCodec(document), (previous) => previous)
	.build();
