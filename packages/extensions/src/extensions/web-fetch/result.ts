import type { ToolOutput } from '../../api/core/tool.js';
import type { WebFetchProcessedResult } from './types.js';

export function toContentResult(
	entry: WebFetchProcessedResult,
	cached: boolean,
): ToolOutput {
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
