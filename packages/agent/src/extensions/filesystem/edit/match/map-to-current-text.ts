import { splitLines } from '../../common/text/split-lines.js';

// Requires unchanged target lines at the same line numbers. The saved snapshot
// uses LF endings; current text keeps its original endings for the replacement.
export function mapMatchToCurrentText(
	snapshot: string,
	current: string,
	index: number,
	length: number,
): { index: number; length: number } {
	const currentLines = splitLines(current);

	function offsetInCurrent(savedOffset: number): number {
		const savedPrefixLines = snapshot.slice(0, savedOffset).split('\n');
		const lineIndex = savedPrefixLines.length - 1;
		const column = savedPrefixLines.at(-1)?.length ?? 0;
		// Earlier lines may have new lengths or CRLF endings. The verified target
		// keeps its column, but its line starts at a different character offset.
		const currentLineStart = currentLines.slice(0, lineIndex).join('').length;
		return currentLineStart + column;
	}

	const start = offsetInCurrent(index);
	const end = offsetInCurrent(index + length);
	return { index: start, length: end - start };
}
