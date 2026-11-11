import type { QuestionSource } from '../types.js';
import { subsequenceLength } from './subsequence.js';

type Passage = { start: number; end: number };
type Line = { text: string; normalized: string; index: number; start: number };

export function findSourcePassage(
	content: string,
	source: QuestionSource,
): Passage | undefined {
	const quote = withoutWhitespace(source.quote);
	if (!quote) return undefined;
	let offset = 0;
	const lines = content.split('\n').map((text, index): Line => {
		const line = {
			text,
			normalized: withoutWhitespace(text),
			index,
			start: offset,
		};
		offset += text.length + 1;
		return line;
	});
	const originalLine = source.location?.from.line ?? 0;
	const original = lines[originalLine];
	const column = source.location?.from.ch ?? 0;
	if (original && column <= original.text.length) {
		const start = original.start + column;
		if (content.slice(start, start + source.quote.length) === source.quote)
			return { start, end: start + source.quote.length };
	}
	let exact: Passage | undefined;
	let distance = Infinity;
	let lineIndex = 0;
	for (
		let start = content.indexOf(source.quote);
		start >= 0;
		start = content.indexOf(source.quote, start + 1)
	) {
		while ((lines[lineIndex + 1]?.start ?? Infinity) <= start) lineIndex++;
		const candidateDistance = Math.abs(lineIndex - originalLine);
		if (candidateDistance < distance) {
			exact = { start, end: start + source.quote.length };
			distance = candidateDistance;
		}
	}
	if (exact) return exact;

	// See docs/inbox-ui-regressions.md (A08) for the source navigation contract.
	// A multiline capture anchors on its first nonblank line for prefix matching.
	// Only a unique prefix wins; ambiguous prefixes enter the same LCS ranking as
	// every other line, with proximity to the saved line breaking equal scores.
	const prefix =
		source.quote.split('\n').map(withoutWhitespace).find(Boolean) ?? quote;
	const prefixes = lines.filter((line) => line.normalized.startsWith(prefix));
	const uniquePrefix = prefixes.length === 1 ? prefixes[0] : undefined;
	if (uniquePrefix) return linePassage(uniquePrefix);
	let best: Line | undefined;
	let score = 0;
	for (const line of lines) {
		const closer =
			!best ||
			Math.abs(line.index - originalLine) < Math.abs(best.index - originalLine);
		// Skip lines whose maximum possible LCS cannot improve the current choice.
		const maximum = Math.min(line.normalized.length, quote.length);
		if (maximum < score || (maximum === score && !closer)) continue;
		const length = subsequenceLength(line.normalized, quote);
		if (length > score || (length > 0 && length === score && closer)) {
			best = line;
			score = length;
		}
	}
	return best ? linePassage(best) : undefined;
}

function withoutWhitespace(text: string): string {
	return text.replace(/\s/g, '');
}

function linePassage(line: Line): Passage {
	return { start: line.start, end: line.start + line.text.length };
}
