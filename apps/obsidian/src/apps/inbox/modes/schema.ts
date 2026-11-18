import { z } from 'zod';
import { questionSchema } from '../controller/question-schema.js';

export const thoughtDumpSchema = questionSchema
	.pick({
		id: true,
		text: true,
		createdAt: true,
		provider: true,
		model: true,
		reasoning: true,
		answerInstructions: true,
		source: true,
	})
	.extend({
		groupId: z.string().min(1).optional(),
		state: z.discriminatedUnion('kind', [
			z.object({ kind: z.literal('queued') }),
			z.object({ kind: z.literal('running') }),
			z.object({ kind: z.literal('failed'), error: z.string() }),
			z.object({
				kind: z.literal('succeeded'),
				count: z.number().int().positive(),
			}),
		]),
	});
