import { encode } from '@franklin/lib';
import type { WebAPI } from '../../../systems/environment/api/types.js';
import { decodeBody } from '../utils.js';
import type { WebSearchExtensionOptions, WebSearchResult } from './types.js';

const EXA_MCP_URL = 'https://mcp.exa.ai/mcp';

type ExaMcpRpcResponse = {
	result?: {
		content?: Array<{ type?: string; text?: string }>;
		isError?: boolean;
	};
	error?: {
		code?: number;
		message?: string;
	};
};

type ExaParsedResult = {
	title: string;
	url: string;
	content: string;
};

export async function searchWithExa(
	web: WebAPI,
	query: string,
	options: WebSearchExtensionOptions,
): Promise<WebSearchResult[]> {
	const response = await web.fetch({
		url: EXA_MCP_URL,
		method: 'POST',
		timeoutMs: options.timeoutMs,
		maxRedirects: options.maxRedirects,
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

export function parseExaMcpResponse(body: string): WebSearchResult[] {
	const rpc = parseExaRpcResponse(body);
	if (!rpc) {
		throw new Error('Exa MCP returned an empty response');
	}

	if (rpc.error) {
		const code = typeof rpc.error.code === 'number' ? ` ${rpc.error.code}` : '';
		throw new Error(
			`Exa MCP error${code}: ${rpc.error.message || 'Unknown error'}`,
		);
	}

	if (rpc.result?.isError) {
		const message = rpc.result.content
			?.find(
				(item) =>
					item.type === 'text' &&
					typeof item.text === 'string' &&
					item.text.trim().length > 0,
			)
			?.text?.trim();
		throw new Error(message || 'Exa MCP returned an error');
	}

	const text = rpc.result?.content?.find(
		(item) =>
			item.type === 'text' &&
			typeof item.text === 'string' &&
			item.text.trim().length > 0,
	)?.text;
	if (!text) {
		throw new Error('Exa MCP returned empty content');
	}

	const parsed = parseExaResultText(text, 10_000);
	if (parsed.length === 0) {
		throw new Error('Exa MCP returned no usable results');
	}

	return parsed.map((result) => ({
		title: result.title,
		url: result.url,
		snippet: toSnippet(result.content),
	}));
}

function parseExaRpcResponse(body: string): ExaMcpRpcResponse | null {
	const dataLines = body.split('\n').filter((line) => line.startsWith('data:'));

	for (const line of dataLines) {
		const payload = line.slice(5).trim();
		if (payload === '') continue;
		try {
			const candidate = JSON.parse(payload) as ExaMcpRpcResponse;
			if (candidate.result || candidate.error) {
				return candidate;
			}
		} catch {
			// Ignore non-JSON SSE frames.
		}
	}

	try {
		const candidate = JSON.parse(body) as ExaMcpRpcResponse;
		if (candidate.result || candidate.error) {
			return candidate;
		}
	} catch {
		// Ignore non-JSON fallback bodies and report the parse failure below.
	}

	return null;
}

export function parseExaResultText(
	text: string,
	maxResults: number,
): ExaParsedResult[] {
	const blocks = text
		.split(/(?=^Title: )/m)
		.map((block) => block.trim())
		.filter((block) => block.length > 0);

	const results: ExaParsedResult[] = [];
	for (const block of blocks) {
		if (results.length >= maxResults) break;

		const title = block.match(/^Title: (.+)/m)?.[1]?.trim() ?? '';
		const url = block.match(/^URL: (.+)/m)?.[1]?.trim() ?? '';
		if (url === '') continue;

		let content = '';
		const textStart = block.indexOf('\nText: ');
		if (textStart >= 0) {
			content = block.slice(textStart + 7).trim();
		} else {
			const highlightsMatch = block.match(/\nHighlights:\s*\n/);
			if (highlightsMatch?.index != null) {
				content = block
					.slice(highlightsMatch.index + highlightsMatch[0].length)
					.trim();
			}
		}

		results.push({
			title,
			url,
			content: content.replace(/\n---\s*$/, '').trim(),
		});
	}

	return results;
}

function toSnippet(content: string): string {
	return content.replace(/\s+/g, ' ').trim().slice(0, 500);
}
