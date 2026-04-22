import type { Fetch } from '../types.js';
import type { FetchDecorator } from './types.js';

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

export function withOnlyHTTP(): FetchDecorator {
	return (next: Fetch): Fetch =>
		async (request) => {
			assertOnlyHTTP(request.url);
			return next(request);
		};
}

function assertOnlyHTTP(rawUrl: string): void {
	if (rawUrl.trim() === '') {
		throw new Error('URL is required');
	}

	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		throw new Error(`Invalid URL: ${rawUrl}`);
	}

	if (!HTTP_PROTOCOLS.has(url.protocol)) {
		throw new Error('Only HTTP and HTTPS URLs are supported');
	}
}
