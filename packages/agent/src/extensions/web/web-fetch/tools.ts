import { z } from 'zod';
import {
	toolSpec,
	type ToolSpec,
} from '../../../modules/core/api/tool-spec.js';
import type { ToolOutput } from '../../../modules/core/api/tool.js';
import { webFetchDescription } from '../../system_prompts.js';

export const fetchUrlSpec: ToolSpec<'fetch_url', { url: string }, ToolOutput> =
	toolSpec(
		'fetch_url',
		webFetchDescription,
		z.object({
			url: z
				.string()
				.describe('Public HTTP/HTTPS URL to fetch and extract text from.'),
		}),
	);
