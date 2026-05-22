import { z } from 'zod';
import {
	toolSpec,
	type ToolSpec,
} from '../../../modules/core/api/tool-spec.js';
import type { ToolOutput } from '../../../modules/core/api/tool.js';
import { webSearchDescription } from '../../system_prompts.js';

export const searchWebSpec: ToolSpec<
	'search_web',
	{ query: string },
	ToolOutput
> = toolSpec(
	'search_web',
	webSearchDescription,
	z.object({
		query: z
			.string()
			.min(1)
			.describe(
				'Search query string to run through the configured web search providers.',
			),
	}),
);
