import type { ContentBlockResult } from '../../api/core/content-block.js';
import type {
	WebFetchCacheEntry,
	WebFetchProcessedResult,
} from './types.js';

export function toContentResult(
	entry: WebFetchCacheEntry | WebFetchProcessedResult,
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
	entry: WebFetchCacheEntry | WebFetchProcessedResult,
	cached: boolean,
): string {
	const lines = [
		`URL: ${entry.requestedUrl}`,
		`Final URL: ${entry.finalUrl}`,
		`Status: ${entry.status} ${entry.statusText}`,
		`Content-Type: ${entry.contentType ?? 'unknown'}`,
		`Kind: ${entry.kind}`,
		`Cached: ${cached ? 'yes' : 'no'}`,
		`Truncated: ${entry.truncated ? 'yes' : 'no'}`,
	];

	if (entry.title) {
		lines.push(`Title: ${entry.title}`);
	}

	return `${lines.join('\n')}\n\n${entry.text}`;
}
