import { z } from 'zod';
import { questionSchema } from '../controller/question-schema.js';
import { evidenceSchema } from './evidence/schema.js';
import { mochiSnapshotSchema } from './mochi/schema.js';

const settings = z.object({
	collectionFolder: z.string().min(1),
	databasePath: z.string().min(1),
});
const episode = z
	.object({
		id: z.uuid(),
		folder: z.string().min(1),
		databasePath: z.string().min(1),
		question: questionSchema,
		ancestors: z.array(questionSchema),
		startedAt: z.number().int().nonnegative(),
		draftBaseline: z
			.object({
				cardIds: z.array(z.string().min(1)).max(1000),
				capturedAt: z.number().int().nonnegative(),
				source: z.enum(['record-start', 'manual-recovery']),
				note: z.string().optional(),
			})
			.optional(),
		endedAt: z.number().int().nonnegative().optional(),
		phase: z.enum(['recording', 'stopped', 'reviewing', 'saving']),
		research: z.array(evidenceSchema),
		snapshots: z.array(mochiSnapshotSchema),
		excludedCardIds: z.array(z.string()),
		confirmedAt: z.number().int().optional(),
		confirmedEmpty: z.boolean().optional(),
		completedAt: z.number().int().optional(),
		error: z.string().optional(),
	})
	.superRefine((episode, ctx) => {
		if (episode.phase !== 'recording' && episode.endedAt === undefined)
			ctx.addIssue({
				code: 'custom',
				message: 'Stopped episode has no end time',
			});
		if (
			['reviewing', 'saving'].includes(episode.phase) &&
			!episode.snapshots.length
		)
			ctx.addIssue({ code: 'custom', message: 'Episode has no card snapshot' });
		if (
			episode.phase === 'saving' &&
			episode.completedAt === undefined &&
			episode.confirmedAt === undefined
		)
			ctx.addIssue({
				code: 'custom',
				message: 'Episode has no completion time',
			});
		const identities = [episode.question, ...episode.ancestors];
		if (
			episode.research.length !== identities.length ||
			episode.research.some(
				(entry, index) =>
					entry.question.id !== identities[index]?.id ||
					entry.question.attemptId !== identities[index].attemptId,
			)
		)
			ctx.addIssue({
				code: 'custom',
				message: 'Research does not match the pinned question branch',
			});
	});

const completedEpisode = z.object({
	id: z.uuid(),
	questionId: z.string(),
	attemptId: z.string(),
	path: z.string(),
	cardCount: z.number().int().nonnegative(),
	completedAt: z.number().int(),
});
const legacyCompletedEpisode = completedEpisode
	.omit({ path: true, completedAt: true })
	.extend({ confirmedAt: z.number().int() });

export const captureSchema = z.object({
	version: z.literal(1),
	settings,
	pending: episode.optional(),
	completed: z.array(
		z.union([
			completedEpisode,
			legacyCompletedEpisode
				.extend({ path: z.string() })
				.transform(({ confirmedAt, ...entry }) => ({
					...entry,
					completedAt: confirmedAt,
				})),
			// Preserve references to episodes saved by the original directory writer.
			legacyCompletedEpisode
				.extend({ folder: z.string() })
				.transform(({ folder, confirmedAt, ...entry }) => ({
					...entry,
					path: folder,
					completedAt: confirmedAt,
				})),
		]),
	),
});
