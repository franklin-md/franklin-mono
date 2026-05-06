import { z } from 'zod';
import { toolSpec } from '../../../modules/core/api/tool-spec.js';
import { readFileDescription } from '../../system_prompts.js';

const readFileSchema = z.object({
	path: z
		.string()
		.describe(
			'Path to the file. Relative file paths (like `../../path.to.file `)' +
				"are accepted as arguments, but the request may be denied if the file path is outside of the scope of this agent's environment",
		),
	limit: z.number().default(2000).describe('Number of lines to read'),
	offset: z
		.number()
		.optional()
		.describe(
			'Line number to start reading from. By default starts at 1. (OPTIONAL)',
		),
});

export const readFileSpec = toolSpec(
	'read_file',
	readFileDescription,
	readFileSchema,
);
