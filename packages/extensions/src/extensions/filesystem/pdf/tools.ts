import { z } from 'zod';
import { toolSpec } from '../../../modules/core/api/tool-spec.js';
import { readPDFDescription } from '../../system_prompts.js';

const readPDFSchema = z.object({
	path: z
		.string()
		.describe(
			'Path to the PDF file. Relative file paths (like `../../path.to.file `)' +
				"are accepted as arguments, but the request may be denied if the file path is outside of the scope of this agent's environment",
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

export const readPDFSpec = toolSpec(
	'read_pdf',
	readPDFDescription,
	readPDFSchema,
);
