import { groupSchema } from '../hierarchy/schema.js';
import { validateHierarchy } from '../hierarchy/validate.js';
import { thoughtDumpSchema } from '../modes/schema.js';
import { versioned, zodCodec } from '@franklin/lib';
import { z } from 'zod';
import type { InboxAction, InboxActionRun } from '../actions/types.js';
import { inboxActionSchema } from '../actions/schema.js';
import type { InboxDocument, InboxSettings } from './types.js';
import { questionSchema as question } from './question-schema.js';
import { failedStateSchema } from './failed-schema.js';
import { migrateAnswerInstructions } from './migrate-instructions.js';
import { migrateActionIcon } from './migrate-action-icon.js';

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
const legacyDocument = z.strictObject({
	questions: z.array(legacyQuestion),
	preferences: legacyPreferences,
	groups: z.array(z.never()).optional(),
	thoughtDumps: z.array(z.never()).optional(),
	actions: z.array(z.never()).optional(),
	actionRuns: z.array(z.never()).optional(),
});

// Action definitions in storage versions 2-10 had no icon or color. Keep
// these fixed so older files keep decoding after the current schema changes.
const legacyAction = z.object({
	id: z.string().min(1),
	name: z
		.string()
		.trim()
		.min(1)
		.refine((name) => !/[\r\n]/.test(name)),
	prompt: z.string().trim().min(1),
});
type LegacyAction = z.infer<typeof legacyAction>;
// Versions 1-11 also held the Inbox settings, now in inbox-settings.json.
type SettingsDocument = InboxDocument & {
	preferences: Omit<InboxSettings, 'actions'>;
	actions: InboxAction[];
};
type LegacyDocument = Omit<SettingsDocument, 'actions' | 'actionRuns'> & {
	actions: LegacyAction[];
	actionRuns: (Omit<InboxActionRun, 'action'> & { action: LegacyAction })[];
};
const actionRun = z.object({
	id: z.string().min(1),
	attemptId: z.string().min(1),
	action: legacyAction,
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
		failedStateSchema,
		z.object({
			kind: z.literal('succeeded'),
			summary: z.string().trim().min(1),
		}),
	]),
});
const actionDocument = legacyDocument.extend({
	actions: z.array(legacyAction).default([]),
	actionRuns: z
		.array(
			actionRun.extend({
				question: legacyQuestion.refine(
					(q) => q.state.kind === 'answered',
					'Action question must be answered',
				),
				ancestors: z.array(legacyQuestion),
			}),
		)
		.default([]),
});
const documentShape = z.strictObject({
	questions: z.array(question),
	groups: z.array(z.never()).optional(),
	thoughtDumps: z.array(thoughtDumpSchema).optional(),
	preferences,
	actions: z.array(legacyAction).default([]),
	actionRuns: z.array(actionRun).default([]),
});
const document: z.ZodType<LegacyDocument> = documentShape
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
	.superRefine(validateActions);

function validateActions(document: LegacyDocument, ctx: z.RefinementCtx) {
	const { actions } = document;
	if (new Set(actions.map((a) => a.id)).size !== actions.length)
		ctx.addIssue({ code: 'custom', message: 'Duplicate inbox IDs' });
	validateRuns(document, ctx);
}

function validateRuns(
	{
		actionRuns,
		questions,
		thoughtDumps,
		groups,
	}: Pick<LegacyDocument, 'questions' | 'thoughtDumps' | 'groups'> & {
		actionRuns: {
			id: string;
			question: { id: string };
			action: { id: string };
		}[];
	},
	ctx: z.RefinementCtx,
) {
	const ids = [
		...questions.map((q) => q.id),
		...(thoughtDumps ?? []).map((dump) => dump.id),
		...(groups ?? []).map((group) => group.id),
		...actionRuns.map((run) => run.id),
	];
	if (new Set(ids).size !== ids.length)
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
}

const groupedDocument: z.ZodType<LegacyDocument> = documentShape
	.extend({ groups: z.array(groupSchema).optional() })
	.superRefine(validateHierarchy)
	.superRefine(validateActions);

const iconDocument: z.ZodType<SettingsDocument> = documentShape
	.extend({
		groups: z.array(groupSchema).optional(),
		actions: z.array(inboxActionSchema).default([]),
		actionRuns: z
			.array(actionRun.extend({ action: inboxActionSchema }))
			.default([]),
	})
	.superRefine(validateHierarchy)
	.superRefine(validateActions);

const workDocument: z.ZodType<InboxDocument> = documentShape
	.omit({ preferences: true, actions: true })
	.extend({
		groups: z.array(groupSchema).optional(),
		actionRuns: z
			.array(actionRun.extend({ action: inboxActionSchema }))
			.default([]),
	})
	.superRefine(validateHierarchy)
	.superRefine(validateRuns);

// Released Inbox base (#312) used version 7 for a flat question queue.
// Decode it separately so v6 Madrid data keeps its group and action records.
const baseDocument: z.ZodType<LegacyDocument> = z
	.strictObject({
		questions: z.array(question),
		preferences: preferences.extend({ mode: z.literal('question').optional() }),
		groups: z.array(z.never()).optional(),
		actions: z.array(z.never()).optional(),
		actionRuns: z.array(z.never()).optional(),
		thoughtDumps: z.array(z.never()).optional(),
	})
	.transform(({ questions, preferences }) => ({
		questions,
		preferences,
		actions: [],
		actionRuns: [],
	}));

const throughVersion11 = versioned()
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
	.version(7, zodCodec(baseDocument), (previous) => previous)
	.version(8, zodCodec(groupedDocument), (previous) => previous)
	// Version 9 was used by the Groups-only extraction and has no actions.
	.version(9, zodCodec(groupedDocument), (previous) => previous)
	.version(10, zodCodec(groupedDocument), (previous) => previous)
	// Actions and run snapshots gain an icon and color; older plugins must
	// reject this format rather than strip them.
	.version(11, zodCodec(iconDocument), (previous) => ({
		...previous,
		actions: previous.actions.map(migrateActionIcon),
		actionRuns: previous.actionRuns.map((run) => ({
			...run,
			action: migrateActionIcon(run.action),
		})),
	}));

// Reads the settings that versions 1-11 kept here, once, to seed
// inbox-settings.json.
export const settingsDocumentCodec = throughVersion11.build();

export const inboxCodec = throughVersion11
	// Settings moved to inbox-settings.json. Older plugins must reject this
	// format rather than open the Inbox without its settings.
	.version(
		12,
		zodCodec(workDocument),
		({ preferences: _preferences, actions: _actions, ...work }) => work,
	)
	.build();
