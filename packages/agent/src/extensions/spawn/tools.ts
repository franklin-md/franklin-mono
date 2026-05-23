import { z } from 'zod';
import { toolSpec, type ToolSpec } from '../../modules/core/api/tool-spec.js';
import type { RenderedToolOutput } from '../../modules/core/api/tool.js';
import { spawnDescription } from '../system_prompts.js';

type SpawnOutput = string | RenderedToolOutput;
type SpawnArgs = {
	name: string;
	prompt: string;
};

export const spawnSpec: ToolSpec<'spawn', SpawnArgs, SpawnOutput> = toolSpec(
	'spawn',
	spawnDescription,
	z.object({
		name: z
			.string()
			.trim()
			.min(1)
			.describe('Short display name for this child agent based on its task'),
		prompt: z.string().describe('The task to give the child agent'),
	}),
);
