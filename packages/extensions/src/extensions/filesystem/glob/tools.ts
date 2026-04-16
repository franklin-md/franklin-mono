import { z } from 'zod';
import { toolSpec } from '../../../systems/core/api/tool-spec.js';
import { globDescription } from '../../system_prompts.js';

const globSchema = z.object({
	pattern: z
		.string()
		.or(z.array(z.string()))
		.describe(
			'The glob pattern (or list of patterns) to match files against (REQUIRED).',
		),
	options: z.object({
		root_dir: z
			.string()
			.optional()
			.describe(
				'The directory to search in. (OPTIONAL, defaults to current working directory)',
			),
		exclude: z
			.array(z.string())
			.optional()
			.describe(
				"One pattern or a list of glob patterns to be excluded. If a string array is provided, each string should be a glob pattern that specifies paths to exclude. Note: Negation patterns (e.g., '!foo.js') are not supported.",
			),
		limit: z
			.number()
			.optional()
			.describe(
				'How many results to return. If specified, the tool will return only the first `limit` results.',
			),
	}),
});

export const globSpec = toolSpec('glob', globDescription, globSchema);
