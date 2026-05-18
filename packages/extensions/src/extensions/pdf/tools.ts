import { z } from 'zod';
import { toolSpec } from '../../modules/core/api/tool-spec.js';
import { readPDFDescription } from '../system_prompts.js';

const pageNumberSchema = z
	.number()
	.int()
	.positive()
	.describe('PDF page number, starting at 1');

const readPDFSchema = z
	.object({
		path: z
			.string()
			.describe(
				'Path to the PDF file. Relative file paths (like `../../path.to.file `)' +
					"are accepted as arguments, but the request may be denied if the file path is outside of the scope of this agent's environment",
			),
		start_page: pageNumberSchema
			.optional()
			.describe(
				'First page to process, starting at 1. If omitted, starts at page 1. (OPTIONAL)',
			),
		end_page: pageNumberSchema
			.optional()
			.describe(
				'Last page to process, inclusive. If omitted, processes through the end of the PDF. (OPTIONAL)',
			),
	})
	.refine(
		({ start_page, end_page }) =>
			start_page === undefined ||
			end_page === undefined ||
			start_page <= end_page,
		{
			message: 'start_page must be less than or equal to end_page',
			path: ['start_page'],
		},
	);

export const readPDFSpec = toolSpec(
	'read_pdf',
	readPDFDescription,
	readPDFSchema,
);
