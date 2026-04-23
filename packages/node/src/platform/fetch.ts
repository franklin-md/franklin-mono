import type { Fetch } from '@franklin/lib';
import { readBodyWithLimit } from '@franklin/lib';

import { nodeHttpFetch } from './http/fetch.js';

/**
 * Default Node platform transport. Wraps the shared fetch-like Node HTTP
 * implementation with manual redirect handling (the `withRedirect` decorator
 * owns the loop) and credentials omitted.
 */
export const nodePlatformFetch: Fetch = async (request) => {
	const response = await nodeHttpFetch(request.url, {
		method: request.method,
		redirect: 'manual',
		credentials: 'omit',
		headers: request.headers,
		body: request.body,
	});

	const body = await readBodyWithLimit(response.body);

	return {
		url: response.url || request.url,
		status: response.status,
		statusText: response.statusText,
		headers: Object.fromEntries(response.headers.entries()),
		body,
	};
};
