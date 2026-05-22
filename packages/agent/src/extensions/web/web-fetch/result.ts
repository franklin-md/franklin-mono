import type { RenderedToolOutput } from '../../../modules/core/api/tool.js';
import type { WebFetchProcessedResult } from './types.js';

export function toContentResult(
	entry: WebFetchProcessedResult,
): RenderedToolOutput {
	return {
		content: [
			{
				type: 'text',
				text: formatResult(entry),
			},
		],
		isError: entry.isError,
	};
}

export function formatResult(entry: WebFetchProcessedResult): string {
	const lines = [
		`Kind: ${entry.kind}`,
		`Truncated: ${entry.truncated ? 'yes' : 'no'}`,
		`Content: ${entry.content}`,
	];

	return lines.join('\n');
}
