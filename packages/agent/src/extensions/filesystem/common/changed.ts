import { normalizeToLF } from './text/line-endings.js';
import { splitLines } from './text/split-lines.js';
import type { FileSnapshot, LineRange } from './types.js';

export function snapshotChanged(
	saved: FileSnapshot,
	current: FileSnapshot,
	range?: LineRange,
): boolean {
	if (!range || saved.text === undefined || current.text === undefined) {
		return saved.hash !== current.hash;
	}

	const savedLines = splitLines(normalizeToLF(saved.text));
	const currentLines = splitLines(normalizeToLF(current.text));

	// Keep terminators in the comparison: removing a line's newline changes it.
	const firstLineIndex = range.startLine - 1;
	const savedTarget = savedLines.slice(firstLineIndex, range.endLine).join('');
	const currentTarget = currentLines
		.slice(firstLineIndex, range.endLine)
		.join('');
	return savedTarget !== currentTarget;
}
