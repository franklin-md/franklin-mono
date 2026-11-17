import type { LineRange } from '../../common/types.js';

/** One-based, inclusive lines touched by the match in an LF-normalized snapshot. */
export function linesTouchedByMatch(
	snapshot: string,
	index: number,
	length: number,
): LineRange | undefined {
	if (length === 0) return undefined;
	const lastMatchedCharacter = index + length - 1;
	return {
		startLine: lineNumberAt(snapshot, index),
		// Use the last matched character so a trailing newline belongs to its own
		// line, rather than treating the following line as part of the edit.
		endLine: lineNumberAt(snapshot, lastMatchedCharacter),
	};
}

function lineNumberAt(text: string, characterIndex: number): number {
	return text.slice(0, characterIndex).split('\n').length;
}
