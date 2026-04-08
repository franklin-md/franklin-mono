import { describe, expect, it } from 'vitest';
import { processWebResponse } from '../process.js';
import type { WebFetchResponse } from '../../../api/environment/types.js';
import type { ResolvedWebFetchExtensionOptions } from '../types.js';

const options: ResolvedWebFetchExtensionOptions = {
	timeoutMs: 8000,
	maxResponseBytes: 5_000_000,
	maxRedirects: 5,
	cacheTtlMs: 900_000,
	cacheMaxEntries: 20,
	maxOutputChars: 20_000,
};

function response(overrides: Partial<WebFetchResponse>): WebFetchResponse {
	return {
		requestedUrl: 'https://example.com',
		finalUrl: 'https://example.com',
		status: 200,
		statusText: 'OK',
		contentType: 'text/plain',
		headers: {},
		body: new TextEncoder().encode('hello'),
		...overrides,
	};
}

describe('processWebResponse', () => {
	it('does not cache HTTP errors', () => {
		const result = processWebResponse(
			response({ status: 404, statusText: 'Not Found' }),
			options,
		);

		expect(result.kind).toBe('http_error');
		expect(result.isError).toBe(true);
		expect(result.cacheable).toBe(false);
	});

	it('does not cache unsupported content types', () => {
		const result = processWebResponse(
			response({
				contentType: 'application/octet-stream',
				body: new Uint8Array([0, 1, 2, 3]),
			}),
			options,
		);

		expect(result.kind).toBe('unsupported');
		expect(result.isError).toBe(true);
		expect(result.cacheable).toBe(false);
	});
});
