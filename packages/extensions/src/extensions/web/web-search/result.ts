import type { ToolOutput } from 'packages/extensions/src/api/index.js';
import type { WebSearchResult } from './types.js';

export function toSearchResult(
	query: string,
	results: WebSearchResult[],
): ToolOutput {
	if (results.length === 0) {
		return {
			content: [
				{
					type: 'text',
					text: `Query: ${query}\n\nNo results found.`,
				},
			],
			isError: false,
		};
	}

	const lines: string[] = [`Query: ${query}`, `Results: ${results.length}`, ''];
	results.forEach((result, index) => {
		lines.push(`${index + 1}. ${result.title}`);
		lines.push(`   URL: ${result.url}`);
		if (result.snippet !== '') {
			lines.push(`   ${result.snippet}`);
		}
		lines.push('');
	});

	return {
		content: [{ type: 'text', text: lines.join('\n').trimEnd() }],
		isError: false,
	};
}

export function toSearchError(
	query: string,
	error: unknown,
): ToolOutput {
	const message = error instanceof Error ? error.message : String(error);
	return {
		content: [
			{
				type: 'text',
				text: `Query: ${query}\n\nSearch failed: ${message}`,
			},
		],
		isError: true,
	};
}
