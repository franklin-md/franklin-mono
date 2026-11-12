import { groupSchema } from '../hierarchy/schema.js';
import { validateHierarchy } from '../hierarchy/validate.js';
import { thoughtDumpSchema } from '../modes/schema.js';
import { versioned, zodCodec } from '@franklin/lib';
import { z } from 'zod';
import type { InboxDocument } from './types.js';
import { questionSchema as question } from './question-schema.js';
import { migrateAnswerInstructions } from './migrate-instructions.js';

const preferences = z.object({
	provider: z.string().min(1),
	model: z.string().min(1),
	reasoning: question.shape.reasoning,
	answerInstructions: z.string(),
	concurrency: z.number().int().min(1).max(4),
	mode: z.enum(['question', 'thought-dump']).optional(),
});
const legacyQuestion = question
	.omit({ answerInstructions: true })
	.extend({ terse: z.boolean() });
const legacyPreferences = preferences
	.omit({ answerInstructions: true })
	.extend({ terse: z.boolean() });
const legacyDocument = z.object({
	questions: z.array(legacyQuestion),
	preferences: legacyPreferences,
});

const action = z.object({
	id: z.string().min(1),
	name: z
		.string()
		.trim()
		.min(1)
		.refine((name) => !/[\r\n]/.test(name)),
	prompt: z.string().trim().min(1),
});
const actionRun = z.object({
	id: z.string().min(1),
	attemptId: z.string().min(1),
	action,
	question: question.refine(
		(q) => q.state.kind === 'answered',
		'Action question must be answered',
	),
	ancestors: z.array(question),
	groups: z.array(groupSchema).optional(),
	provider: z.string().min(1),
	model: z.string().min(1),
	reasoning: question.shape.reasoning,
	createdAt: z.number(),
	state: z.discriminatedUnion('kind', [
		z.object({ kind: z.literal('queued') }),
		z.object({ kind: z.literal('running') }),
		z.object({ kind: z.literal('failed'), error: z.string() }),
		z.object({
			kind: z.literal('succeeded'),
			summary: z.string().trim().min(1),
		}),
	]),
});
const actionDocument = legacyDocument.extend({
	actions: z.array(action),
	actionRuns: z.array(
		actionRun.extend({
			question: legacyQuestion.refine(
				(q) => q.state.kind === 'answered',
				'Action question must be answered',
			),
			ancestors: z.array(legacyQuestion),
		}),
	),
});
const documentShape = z.object({
	questions: z.array(question),
	thoughtDumps: z.array(thoughtDumpSchema).optional(),
	preferences,
	actions: z.array(action),
	actionRuns: z.array(actionRun),
});
const document: z.ZodType<InboxDocument> = documentShape
	.superRefine(({ questions }, ctx) => {
		const byId = new Map(questions.map((q) => [q.id, q]));
		if (byId.size !== questions.length)
			ctx.addIssue({ code: 'custom', message: 'Duplicate question IDs' });
		for (const question of questions) {
			const visited = new Set<string>([question.id]);
			let current = question;
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
	})
	.superRefine(({ actions, actionRuns, questions, thoughtDumps }, ctx) => {
		const ids = [
			...questions.map((q) => q.id),
			...(thoughtDumps ?? []).map((dump) => dump.id),
			...actionRuns.map((run) => run.id),
		];
		if (
			new Set(ids).size !== ids.length ||
			new Set(actions.map((a) => a.id)).size !== actions.length
		)
			ctx.addIssue({ code: 'custom', message: 'Duplicate inbox IDs' });
		const pairs = actionRuns.map((run) =>
			JSON.stringify([run.question.id, run.action.id]),
		);
		if (new Set(pairs).size !== pairs.length)
			ctx.addIssue({ code: 'custom', message: 'Duplicate action runs' });
		for (const run of actionRuns) {
			if (
				!questions.some(
					(q) => q.id === run.question.id && q.state.kind === 'answered',
				)
			)
				ctx.addIssue({ code: 'custom', message: 'Action question is missing' });
		}
	});

const groupedDocument: z.ZodType<InboxDocument> = documentShape
	.extend({ groups: z.array(groupSchema).default([]) })
	.superRefine(validateHierarchy);

export const inboxCodec = versioned()
	.version(1, zodCodec(legacyDocument))
	.version(2, zodCodec(actionDocument), (previous) => ({
		...previous,
		actions: [],
		actionRuns: [],
	}))
	// Migrate every saved snapshot independently: retries must keep the wording
	// captured for that question, even if the inbox preference has since changed.
	.version(3, zodCodec(document), (previous) => ({
		...previous,
		preferences: migrateAnswerInstructions(previous.preferences),
		questions: previous.questions.map(migrateAnswerInstructions),
		actionRuns: previous.actionRuns.map((run) => ({
			...run,
			question: migrateAnswerInstructions(run.question),
			ancestors: run.ancestors.map(migrateAnswerInstructions),
		})),
	}))
	// Older plugins must reject the new format rather than strip folded content.
	.version(4, zodCodec(document), (previous) => previous)
	// Persist extraction jobs alongside their resulting batch; older plugins must reject this format.
	.version(5, zodCodec(document), (previous) => previous)
	// Group parents are not readable by older plugins; keep their question-only validators frozen.
	.version(6, zodCodec(groupedDocument), (previous) => ({
		...previous,
		groups: [],
	}))
	.build();
