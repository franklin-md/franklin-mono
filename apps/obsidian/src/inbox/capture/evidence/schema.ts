import { z } from 'zod';
import { questionSchema } from '../../controller/question-schema.js';

const text = z.object({
	text: z.string(),
	omittedCharacters: z.number().int().nonnegative(),
	redacted: z.boolean(),
});

export const evidenceSchema = z.object({
	version: z.literal(1),
	question: questionSchema,
	ancestors: z.array(questionSchema),
	startedAt: z.number().int(),
	acceptedAt: z.number().int().optional(),
	status: z.enum(['collecting', 'complete', 'partial', 'missing']),
	missing: z.array(z.string()),
	prompt: text,
	systemPrompt: text.optional(),
	events: z.array(
		z.object({
			callId: z.string(),
			name: z.string(),
			calledAt: z.number().int(),
			arguments: text,
			resultAt: z.number().int().optional(),
			result: text.optional(),
			isError: z.boolean().optional(),
		}),
	),
	omittedEvents: z.number().int().nonnegative(),
});
