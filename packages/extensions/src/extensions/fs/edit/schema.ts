import { z } from 'zod';

export const editSchema = z.object({
	path: z.string().describe('Path to the file to edit (relative or absolute)'),
	oldText: z
		.string()
		.describe('Exact text to find and replace (must match exactly)'),
	newText: z.string().describe('New text to replace the old text with'),
});
export type EditInput = z.infer<typeof editSchema>;
