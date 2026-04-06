import { z } from 'zod';
import { toolSpec } from '../../../api/core/tool-spec.js';
import { editFileDescription } from '../../system_prompts.js';

const editFileSchema = z.object({
	path: z.string().describe('Path to the file to edit (relative or absolute)'),
	old_text: z
		.string()
		.describe('Exact text to find and replace (must match file content)'),
	new_text: z.string().describe('New text to replace the old text with'),
	replace_all: z
		.boolean()
		.optional()
		.describe(
			'If true, replace all occurrences of old_text. If false or omitted, the text must appear exactly once.',
		),
});

export const editFileSpec = toolSpec(
	'edit_file',
	editFileDescription,
	editFileSchema,
);
