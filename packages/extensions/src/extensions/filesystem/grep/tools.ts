import { z } from 'zod';
import { toolSpec } from '../../../systems/core/api/tool-spec.js';
import { grepDescription } from '../../system_prompts.js';

const grepSchema = z.object({
	pattern: z.string().describe('Regular expression to search for (REQUIRED).'),
	path: z
		.string()
		.optional()
		.describe(
			'Directory or file to search in (OPTIONAL, defaults to the working directory).',
		),
	include: z
		.string()
		.optional()
		.describe(
			"File glob to filter results (OPTIONAL, e.g. '*.ts' or 'src/**/*.ts').",
		),
	case_insensitive: z
		.boolean()
		.optional()
		.describe('Match case-insensitively (OPTIONAL, defaults to false).'),
	limit: z
		.number()
		.optional()
		.describe(
			'Maximum number of matches to return (OPTIONAL, defaults to 100).',
		),
});

export const grepSpec = toolSpec('grep', grepDescription, grepSchema);

export type GrepParams = z.infer<typeof grepSchema>;
