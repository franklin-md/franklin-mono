import type { ContentBlockResult } from '../../api/core/content-block.js';
import type { WebFetchProcessedResult } from './types.js';

export function toContentResult(
	entry: WebFetchProcessedResult,
	cached: boolean,
): ContentBlockResult {
	return {
		content: [
			{
				type: 'text',
				text: formatResult(entry, cached),
			},
		],
		isError: entry.isError,
	};
}

export function formatResult(
	entry: WebFetchProcessedResult,
	cached: boolean,
): string {
	const lines = [
		`Kind: ${entry.kind}`,
		`Cached: ${cached ? 'yes' : 'no'}`,
		`Truncated: ${entry.truncated ? 'yes' : 'no'}`,
		`Content: ${entry.content}`,
	];

	return lines.join('\n');
}
