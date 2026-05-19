import type { GrepMatch } from '../format/types.js';
import type { LineParser } from './types.js';

export interface CollectMatchesResult {
	matches: GrepMatch[];
	truncated: boolean;
}

export function collectMatches(
	stdout: string,
	parseLine: LineParser,
	limit: number,
): CollectMatchesResult {
	const matches: GrepMatch[] = [];
	for (const line of stdout.split('\n')) {
		const match = parseLine(line);
		if (match === undefined) continue;
		matches.push(match);
		if (matches.length > limit) {
			return {
				matches: matches.slice(0, limit),
				truncated: true,
			};
		}
	}
	return {
		matches,
		truncated: false,
	};
}
