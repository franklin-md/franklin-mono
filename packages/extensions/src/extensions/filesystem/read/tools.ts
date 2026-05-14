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
	limit: z.number().default(2000).describe('Number of text lines to read'),
	offset: z
		.number()
		.optional()
		.describe(
			'Text line number to start reading from. By default starts at 1. (OPTIONAL)',
		),
	pages: z
		.tuple([
			z
				.number()
				.int()
				.positive()
				.describe('First page to process, starting at 1'),
			z.number().int().positive().describe('Last page to process, inclusive'),
		])
		.optional()
		.refine((pages) => !pages || pages[0] <= pages[1], {
			message: 'pages start_page must be less than or equal to end_page',
		})
		.describe(
			'PDF page range to process as [start_page, end_page], inclusive. Page numbers start at 1. (OPTIONAL)',
		),
});

export const readFileSpec = toolSpec(
	'read_file',
	readFileDescription,
	readFileSchema,
);
