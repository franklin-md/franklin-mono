import { z } from 'zod';

const position = z.object({
	line: z.number().int().nonnegative(),
	ch: z.number().int().nonnegative(),
});
const source = z.object({
	note: z.string(),
	heading: z.string(),
	outline: z.array(z.string()).optional(),
	quote: z.string(),
	location: z
		.object({
			id: z.string(),
			path: z.string(),
			from: position,
			to: position,
			context: z.string(),
			capturedAt: z.number(),
		})
		.optional(),
});
const reasoning = z.enum(['off', 'minimal', 'low', 'medium', 'high', 'xhigh']);
const state = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('queued') }),
	z.object({ kind: z.literal('running') }),
	z.object({
		kind: z.literal('answered'),
		answer: z.string().trim().min(1),
		title: z.string().trim().min(1).optional(),
	}),
	z.object({ kind: z.literal('failed'), error: z.string() }),
]);
export const questionSchema = z.object({
	id: z.string().min(1),
	parentId: z.string().optional(),
	rootId: z.string().min(1),
	attemptId: z.string().min(1),
	text: z.string().trim().min(1),
	createdAt: z.number(),
	updatedAt: z.number(),
	provider: z.string().min(1),
	model: z.string().min(1),
	modelLabel: z.string().optional(),
	reasoning,
	answerInstructions: z.string(),
	source: source.optional(),
	state,
});
