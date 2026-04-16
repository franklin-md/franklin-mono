import { z } from 'zod';
import { toolSpec } from '../../../systems/core/api/tool-spec.js';
import { webFetchDescription } from '../../system_prompts.js';

export const fetchUrlSpec = toolSpec(
	'fetch_url',
	webFetchDescription,
	z.object({
		url: z
			.string()
			.describe('Public HTTP/HTTPS URL to fetch and extract text from.'),
	}),
);
