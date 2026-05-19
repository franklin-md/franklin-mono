import { truncateStream } from '@franklin/lib';

import type { FormatMatchesOptions, GrepMatch } from './types.js';

const TRUNCATION_NOTE = '(results truncated; narrow with path/include/limit)';

export function formatMatches(
	matches: GrepMatch[],
	options: FormatMatchesOptions,
): string {
	if (matches.length === 0) return 'No matches found.';

	const { text, truncated: hardTruncated } = truncateStream(
		renderBlocks(matches),
		{
			maxLength: options.maxLength ?? Infinity,
			separator: '\n',
			suffix: TRUNCATION_NOTE,
		},
	);

	if (hardTruncated || !options.truncated) return text;
	return text.length === 0 ? TRUNCATION_NOTE : `${text}\n${TRUNCATION_NOTE}`;
}

// One atomic block per file: `<path>\n  <line>: <text>` rows. Blocks are
// indivisible — `truncateStream` either takes a whole file group or drops it
// entirely, so file headers are never orphaned.
function* renderBlocks(matches: GrepMatch[]): Generator<string> {
	for (const [file, fileMatches] of groupByFile(matches)) {
		const rows = fileMatches.map((m) => `  ${m.line}: ${m.text}`);
		yield [file, ...rows].join('\n');
	}
}

function groupByFile(matches: GrepMatch[]): Map<string, GrepMatch[]> {
	const byFile = new Map<string, GrepMatch[]>();
	for (const match of matches) {
		const list = byFile.get(match.file) ?? [];
		list.push(match);
		byFile.set(match.file, list);
	}
	return byFile;
}
