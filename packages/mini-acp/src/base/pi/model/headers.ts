import type { Model } from '@mariozechner/pi-ai';

import type { Ctx } from '../../../types/context.js';

const OPENROUTER_APP_URL = 'https://franklin.md';
const OPENROUTER_APP_TITLE = 'Franklin';

export function withOpenRouterHeaders(
	config: Ctx['config'],
	model: Model<string>,
): Model<string> {
	if (config?.provider !== 'openrouter') {
		return model;
	}

	const headers = { ...model.headers };
	headers['HTTP-Referer'] = OPENROUTER_APP_URL;
	headers['X-OpenRouter-Title'] = OPENROUTER_APP_TITLE;

	return {
		...model,
		headers,
	};
}
