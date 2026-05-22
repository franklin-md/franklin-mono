import { getHeader, withRetry } from '@franklin/lib';
import { decodeBody, normalizeContentType } from '../../../utils.js';
import type {
	WebSearchProvider,
	WebSearchProviderRequest,
} from '../../provider.js';
import { parseDdgLite } from './parse.js';
import { pickUserAgent } from './user-agents.js';

export function createDuckDuckGoWebSearchProvider(): WebSearchProvider {
	return {
		name: 'DuckDuckGo',
		search: searchWithDuckDuckGo,
	};
}

async function searchWithDuckDuckGo({
	fetch,
	query,
	options,
}: WebSearchProviderRequest) {
	const url = `https://duckduckgo.com/lite?q=${encodeURIComponent(query)}`;

	const retrying = withRetry({
		maxAttempts: options.maxRetries,
		delayMsRange: options.retryDelayMsRange,
	})(async (request) => {
		const response = await fetch(request);
		if (response.status < 200 || response.status >= 300) {
			throw new Error(`HTTP ${response.status} ${response.statusText}`);
		}
		return response;
	});

	const response = await retrying({
		url,
		method: 'GET',
		headers: { 'User-Agent': pickUserAgent() },
	});

	const contentType = getHeader(response.headers, 'content-type');
	if (normalizeContentType(contentType) !== 'text/html') {
		throw new Error(`Unsupported content type: ${contentType ?? 'unknown'}`);
	}

	return parseDdgLite(decodeBody(response.body), options.maxResults);
}
