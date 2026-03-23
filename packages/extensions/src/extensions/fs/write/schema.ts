import { z } from 'zod';

export const writeSchema = z.object({
	path: z.string().describe('Path to the file to write (relative or absolute)'),
	content: z.string().describe('Content to write to the file'),
});
export type WriteInput = z.infer<typeof writeSchema>;
