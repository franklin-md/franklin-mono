import type { Model } from '@mariozechner/pi-ai';
import { setHeader } from '@franklin/lib';

import type { LLMConfig } from '../../../types/context.js';

export const OPENROUTER_APP_URL = 'https://franklin.md';
export const OPENROUTER_APP_TITLE = 'Franklin';
//openrouter.ai/docs/app-attribution#x-openrouter-categories
// Allows 2
export const OPENROUTER_APP_CATEGORY = ['personal-agent', 'general-chat'];

export function withOpenRouterHeaders(
	config: LLMConfig,
	model: Model<string>,
): Model<string> {
	if (config.provider !== 'openrouter') {
		return model;
	}

	// https://openrouter.ai/docs/app-attribution
	// https://openrouter.ai/docs/api/reference/overview#headers
	let headers = setHeader(model.headers, 'HTTP-Referer', OPENROUTER_APP_URL);
	headers = setHeader(headers, 'X-OpenRouter-Title', OPENROUTER_APP_TITLE);
	headers = setHeader(
		headers,
		'X-OpenRouter-Categories',
		OPENROUTER_APP_CATEGORY.join(','),
	);
	return {
		...model,
		headers,
	};
}
