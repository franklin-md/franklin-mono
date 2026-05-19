import { describe, expect, it } from 'vitest';
import { parseExaMcpResponse, parseExaResultText } from '../exa.js';

describe('parseExaMcpResponse', () => {
	it('parses SSE JSON-RPC responses', () => {
		const body = [
			'event: message',
			'data: {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"Title: Example\\nURL: https://example.com\\nText: Example snippet"}]}}',
			'',
		].join('\n');

		expect(parseExaMcpResponse(body)).toEqual([
			{
				title: 'Example',
				url: 'https://example.com',
				snippet: 'Example snippet',
			},
		]);
	});

	it('parses plain JSON-RPC responses', () => {
		const body = JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			result: {
				content: [
					{
						type: 'text',
						text: 'Title: Example\nURL: https://example.com\nHighlights:\nExample highlight',
					},
				],
			},
		});

		expect(parseExaMcpResponse(body)).toEqual([
			{
				title: 'Example',
				url: 'https://example.com',
				snippet: 'Example highlight',
			},
		]);
	});

	it('throws on JSON-RPC errors', () => {
		const body = JSON.stringify({
			jsonrpc: '2.0',
			id: 1,
			error: { code: 429, message: 'Rate limited' },
		});

		expect(() => parseExaMcpResponse(body)).toThrow(
			'Exa MCP error 429: Rate limited',
		);
	});
});

describe('parseExaResultText', () => {
	it('extracts multiple results and respects maxResults', () => {
		const text = [
			'Title: Example One',
			'URL: https://example.com/one',
			'Text: First result body',
			'---',
			'Title: Example Two',
			'URL: https://example.com/two',
			'Highlights:',
			'Second result highlight',
		].join('\n');

		expect(parseExaResultText(text, 1)).toEqual([
			{
				title: 'Example One',
				url: 'https://example.com/one',
				content: 'First result body',
			},
		]);
	});
});
