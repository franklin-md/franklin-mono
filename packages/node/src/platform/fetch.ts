import type { Fetch } from '@franklin/lib';
import { readBodyWithLimit } from '@franklin/lib';
import type { RequestInit as NodeFetchRequestInit } from 'node-fetch';

import { nodeHttpFetch } from './http/fetch.js';

export interface NodePlatformFetchOptions {
	agent?: NodeFetchRequestInit['agent'];
}

/**
 * Default Node platform transport. Wraps the shared fetch-like Node HTTP
 * implementation with manual redirect handling (the `withRedirect` decorator
 * owns the loop) and credentials omitted.
 */
export function createNodePlatformFetch(
	defaultInit: RequestInit = {},
	options: NodePlatformFetchOptions = {},
): Fetch {
	return async (request) => {
		const init: RequestInit = {
			...defaultInit,
			method: request.method,
			redirect: 'manual',
			credentials: 'omit',
			headers: request.headers,
			body: request.body,
		};
		if (options.agent) {
			Object.assign(init, { agent: options.agent });
		}

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
