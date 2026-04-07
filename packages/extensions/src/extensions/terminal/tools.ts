import { z } from 'zod';
import { toolSpec } from '../../api/core/tool-spec.js';
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

export const bashSpec = toolSpec('bash', bashDescription, bashSchema);
