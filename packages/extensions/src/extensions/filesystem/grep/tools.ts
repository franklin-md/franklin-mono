import { z } from 'zod';
import { toolSpec } from '../../../systems/core/api/tool-spec.js';
import { grepDescription } from '../../system_prompts.js';
import {
	GREP_SINGLE_PATH_MESSAGE,
	looksLikeMultipleAbsolutePaths,
} from './validate.js';

const grepSchema = z.object({
	pattern: z.string().describe('Regular expression to search for (REQUIRED).'),
	path: z
		.string()
		.optional()
		.refine(
			(value) => value === undefined || !looksLikeMultipleAbsolutePaths(value),
			GREP_SINGLE_PATH_MESSAGE,
		)
		.describe(
			'Single directory or file to search in (OPTIONAL, defaults to the working directory). Pass one path only, not a space-separated list, otherwise will be rejected.',
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
			'Maximum number of matches to return (OPTIONAL, defaults to 50). Start small and increase only if needed.',
		),
});

export const grepSpec = toolSpec('grep', grepDescription, grepSchema);

export type GrepParams = z.infer<typeof grepSchema>;
