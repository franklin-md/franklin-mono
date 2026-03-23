import { z } from 'zod';

export const lsSchema = z.object({
	path: z
		.string()
		.optional()
		.describe('Directory to list (default: current directory)'),
	limit: z
		.number()
		.optional()
		.describe('Maximum number of entries to return (default: 500)'),
});
export type LsInput = z.infer<typeof lsSchema>;
