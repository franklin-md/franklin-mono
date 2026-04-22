import type { Fetch } from '../types.js';
import type { FetchDecorator } from './types.js';
import { lowercaseHeaders } from '../headers.js';

/**
 * Lowercases request and response header keys. This decorator codifies the
 * Fetch invariant: every `WebFetchRequest` reaching the inner fetch and every
 * `WebFetchResponse` returned to the caller has lowercase keys, so downstream
 * consumers (redirect's `location`, web-fetch's `content-type`) can rely on
 * canonical casing without defensive case-insensitive lookups.
 */
export const withNormalizedHeaders: FetchDecorator = (next: Fetch): Fetch => {
	return async (request) => {
		const response = await next({
			...request,
			headers: lowercaseHeaders(request.headers),
		});
		return { ...response, headers: lowercaseHeaders(response.headers) };
	};
};
