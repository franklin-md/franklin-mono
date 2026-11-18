import { z } from 'zod';

export const extractionSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1)
		.max(100)
		.refine((title) => !/[\r\n]/.test(title), 'Use a single-line title')
		.describe(
			'A short, specific topic title for this set of questions, preferably 3–7 words. Plain text, no generic labels or introductory phrases.',
		),
	questions: z.array(z.string().trim().min(1)),
});
