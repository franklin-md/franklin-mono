import { z } from 'zod';

export const bashSchema = z.object({
	command: z.string().describe('Bash command to execute'),
	timeout: z
		.number()
		.optional()
		.describe('Timeout in seconds (optional, no default timeout)'),
});
export type BashInput = z.infer<typeof bashSchema>;
