import { z } from 'zod';
import {
	toolSpec,
	type ToolSpec,
} from '../../../modules/core/api/tool-spec.js';
import { webSearchDescription } from '../../system_prompts.js';
import type { WebSearchOutput } from './types.js';

export const searchWebSpec: ToolSpec<
	'search_web',
	{ query: string },
	WebSearchOutput
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
