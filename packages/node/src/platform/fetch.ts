import type { Fetch } from '@franklin/lib';
import { readBodyWithLimit } from '@franklin/lib';

/**
 * Default Node platform transport. Wraps `globalThis.fetch` with manual
 * redirect handling (the `withRedirect` decorator owns the loop) and
 * credentials omitted. Header-key casing remains platform-defined, so callers
 * should use `getHeader(...)` for case-insensitive reads.
 */
export const nodePlatformFetch: Fetch = async (request) => {
	const url = new URL(request.url);
	const response = await fetch(url, {
		method: request.method,
		redirect: 'manual',
		credentials: 'omit',
		headers: request.headers,
		body: request.body,
	});

	const body = await readBodyWithLimit(response.body);

	return {
		url: response.url || url.toString(),
		status: response.status,
		statusText: response.statusText,
		headers: Object.fromEntries(response.headers.entries()),
		body,
	};
};
