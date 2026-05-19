import { z } from 'zod';
import { toolSpec } from '../../modules/core/api/tool-spec.js';
import { spawnDescription } from '../system_prompts.js';

export const spawnSpec = toolSpec(
	'spawn',
	spawnDescription,
	z.object({
		prompt: z.string().describe('The task to give the child agent'),
	}),
);
