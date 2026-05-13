import type { Fetch } from '@franklin/lib';
import { readBodyWithLimit } from '@franklin/lib';
import type { RequestInit as NodeFetchRequestInit } from 'node-fetch';

import { nodeHttpFetch } from './http/fetch.js';

/**
 * Default Node platform transport. Wraps the shared fetch-like Node HTTP
 * implementation with manual redirect handling (the `withRedirect` decorator
 * owns the loop) and credentials omitted.
 */
export function createNodePlatformFetch(
	defaultInit: NodeFetchRequestInit = {},
): Fetch {
	return async (request) => {
		const init: NodeFetchRequestInit = {
			...defaultInit,
			method: request.method,
			redirect: 'manual',
			credentials: 'omit',
			headers: request.headers,
			body: request.body,
		};
		const response = await nodeHttpFetch(request.url, init);

		const body = await readBodyWithLimit(response.body);

		return {
			url: response.url || request.url,
			status: response.status,
			statusText: response.statusText,
			headers: Object.fromEntries(response.headers.entries()),
			body,
		};
	};
}

export const nodePlatformFetch: Fetch = createNodePlatformFetch();
