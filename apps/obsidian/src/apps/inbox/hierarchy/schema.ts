import { z } from 'zod';
import { questionSchema } from '../controller/question-schema.js';

export const groupSchema = z.object({
	kind: z.literal('group'),
	id: z.string().min(1),
	order: z.number().int().nonnegative().optional(),
	parentId: z.string().min(1).optional(),
	rootId: z.string().min(1),
	createdAt: z.number(),
	folded: z.boolean(),
	title: z.string().trim().min(1).optional(),
	context: z.string().optional(),
	source: questionSchema.shape.source,
});
