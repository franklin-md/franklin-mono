import { z } from 'zod';
import { toolSpec, type ToolSpec } from '../../modules/core/api/tool-spec.js';
import type { ToolOutput } from '../../modules/core/api/tool.js';
import { bashDescription } from '../system_prompts.js';

const bashSchema = z.object({
	cmd: z.string().describe('The shell command to execute'),
	description: z
		.string()
		.optional()
		.describe('Clear 5-10 word description. Optional but recommended.'),
	timeout: z
		.number()
		.optional()
		.default(120000)
		.describe('Milliseconds before timeout.'),
});

export const bashSpec: ToolSpec<
	'bash',
	z.infer<typeof bashSchema>,
	string | ToolOutput
> = toolSpec('bash', bashDescription, bashSchema);
