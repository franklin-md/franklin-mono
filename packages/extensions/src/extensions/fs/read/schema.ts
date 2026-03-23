import { z } from 'zod';

export const readSchema = z.object({
	path: z.string().describe('Path to the file to read (relative or absolute)'),
	offset: z
		.number()
		.optional()
		.describe('Line number to start reading from (1-indexed)'),
	limit: z.number().optional().describe('Maximum number of lines to read'),
});
export type ReadInput = z.infer<typeof readSchema>;
