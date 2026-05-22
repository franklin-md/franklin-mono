import { encode } from '@franklin/lib';
import { decodeBody } from '../../../utils.js';
import type {
	WebSearchProvider,
	WebSearchProviderRequest,
} from '../../provider.js';
import { parseExaMcpResponse } from './parse.js';

const EXA_MCP_URL = 'https://mcp.exa.ai/mcp';

export function createExaWebSearchProvider(): WebSearchProvider {
	return {
		name: 'Exa MCP',
		search: searchWithExa,
	};
}

async function searchWithExa({
	fetch,
	query,
	options,
}: WebSearchProviderRequest) {
	const response = await fetch({
		url: EXA_MCP_URL,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json, text/event-stream',
		},
		body: encode(
			JSON.stringify({
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/call',
				params: {
					name: 'web_search_exa',
					arguments: {
						query,
						numResults: options.maxResults,
						livecrawl: 'fallback',
						type: 'auto',
						contextMaxCharacters: 3000,
					},
				},
			}),
		),
	});

	if (response.status < 200 || response.status >= 300) {
		const errorText = decodeBody(response.body).slice(0, 300);
		throw new Error(`Exa MCP error ${response.status}: ${errorText}`);
	}

	return parseExaMcpResponse(decodeBody(response.body));
}
