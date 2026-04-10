import { z } from 'zod';
import { toolSpec } from '../../../api/core/tool-spec.js';
import { webSearchDescription } from '../../system_prompts.js';

export const searchWebSpec = toolSpec(
	'search_web',
	webSearchDescription,
	z.object({
		query: z
			.string()
			.min(1)
			.describe('Search query string to run through DuckDuckGo.'),
	}),
);
