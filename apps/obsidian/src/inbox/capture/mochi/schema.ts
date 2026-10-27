import { z } from 'zod';

const object = z.record(z.string(), z.json());

const cardSchema = z.object({
	id: z.string().min(1),
	createdAt: z.number().int().nonnegative(),
	updatedAt: z.number().int().nonnegative().optional(),
	matchedBy: z.enum(['created-in-window', 'draft-saved-in-window']).optional(),
	deckId: z.string().optional(),
	deck: object.optional(),
	content: z.string(),
	fields: object,
	templateId: z.string().optional(),
	template: object.optional(),
	attachments: z.object({
		references: z.json(),
		assets: z.literal('not-copied'),
	}),
	missing: z.array(z.string()),
	revision: z.string(),
	raw: object,
});

export const mochiSnapshotSchema = z.object({
	source: z.string(),
	captureVersion: z.number().int().positive().optional(),
	snapshotStartedAt: z.number().int(),
	snapshotAt: z.number().int(),
	cards: z.array(cardSchema),
});
