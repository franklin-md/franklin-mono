import { z } from 'zod';

export const answerDetailSchema = z.object({
	title: z.string().trim().min(1),
	content: z.string().trim().min(1),
});
