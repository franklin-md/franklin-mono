import { z } from 'zod';
import { toolSpec, type ToolSpec } from '../../modules/core/api/tool-spec.js';
import type { ToolOutput } from '../../modules/core/api/tool.js';
import { spawnDescription } from '../system_prompts.js';

type SpawnOutput = string | ToolOutput;

export const spawnSpec: ToolSpec<'spawn', { prompt: string }, SpawnOutput> =
	toolSpec(
		'spawn',
		spawnDescription,
		z.object({
			prompt: z.string().describe('The task to give the child agent'),
		}),
	);
