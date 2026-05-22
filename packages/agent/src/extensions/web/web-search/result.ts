import type { RenderedToolOutput } from '../../../modules/core/api/tool.js';
import type {
	WebSearchOutput,
	WebSearchProviderFailure,
	WebSearchProviderMetadata,
	WebSearchResult,
} from './types.js';

export function toSearchOutput(
	query: string,
	provider: WebSearchProviderMetadata,
	results: readonly WebSearchResult[],
): WebSearchOutput {
	return {
		kind: 'success',
		query,
		provider,
		results,
	};
}

export function toSearchErrorOutput(
	query: string,
	message: string,
	failures: readonly WebSearchProviderFailure[] = [],
): WebSearchOutput {
	return {
		kind: 'error',
		query,
		message,
		failures,
	};
}

export function renderSearchOutput(
	output: WebSearchOutput,
): RenderedToolOutput {
	switch (output.kind) {
		case 'success':
			return renderSearchSuccess(output.query, output.results);
		case 'error':
			return renderSearchError(output.query, output.message);
	}
}

function renderSearchSuccess(
	query: string,
	results: readonly WebSearchResult[],
): RenderedToolOutput {
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

function renderSearchError(query: string, message: string): RenderedToolOutput {
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
