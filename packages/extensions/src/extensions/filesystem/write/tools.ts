import { z } from 'zod';
import { toolSpec } from '../../../api/core/tool-spec.js';
import { writeFileDescription } from '../../system_prompts.js';

const writeFileSchema = z.object({
	path: z
		.string()
		.describe(
			'Path to the file. Relative file paths (like `../../path.to.file `)' +
				"are accepted as arguments, but the request may be denied if the file path is outside of the scope of this agent's environment",
		),
	content: z.string().describe('The content to write to the file.'),
});

export const writeFileSpec = toolSpec(
	'write_file',
	writeFileDescription,
	writeFileSchema,
);
