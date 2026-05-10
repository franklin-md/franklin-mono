import type { Text } from '@codemirror/state';
import type { Hunk } from '../../compute-hunks.js';

export function looksLikeTableRow(lineText: string): boolean {
	const trimmed = lineText.trim();
	return trimmed.includes('|') && trimmed.replaceAll('|', '').trim().length > 0;
}

export function looksLikeTableDivider(lineText: string): boolean {
	return /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(lineText);
}

export function resolveAnchorPosition(
	doc: Text,
	hunk: Hunk,
): { pos: number; side: -1 | 1 } {
	if (doc.length === 0) {
		return { pos: 0, side: -1 };
	}

	const lineNumber = clampLineNumber(hunk.anchor.lineIndex + 1, doc.lines);
	const line = doc.line(lineNumber);
	if (hunk.anchor.placement === 'after') {
		return { pos: line.to, side: 1 };
	}
	return { pos: line.from, side: -1 };
}

export function resolveActionPosition(
	doc: Text,
	hunk: Hunk,
	visibleHunks: Hunk[],
): number {
	if (doc.length === 0) return 0;

	if (hunk.addedLines.length > 0) {
		if (hunk.newTo >= doc.length) {
			return doc.lineAt(hunk.newFrom).from;
		}

		const nextLine = doc.lineAt(Math.min(hunk.newTo, doc.length));
		if (!isLineInAnotherHunk(doc, nextLine.from, hunk, visibleHunks)) {
			return nextLine.from;
		}

		return doc.lineAt(Math.max(hunk.newTo - 1, hunk.newFrom)).from;
	}

	const lineNumber = clampLineNumber(hunk.anchor.lineIndex + 1, doc.lines);
	return doc.line(lineNumber).from;
}

export function areHunksEqual(left: Hunk, right: Hunk): boolean {
	return (
		left.id === right.id &&
		left.kind === right.kind &&
		left.anchor.lineIndex === right.anchor.lineIndex &&
		left.anchor.placement === right.anchor.placement &&
		left.newFrom === right.newFrom &&
		left.newTo === right.newTo &&
		left.oldFrom === right.oldFrom &&
		left.oldTo === right.oldTo &&
		arraysEqual(left.removedLines, right.removedLines) &&
		arraysEqual(left.addedLines, right.addedLines)
	);
}

function isLineInAnotherHunk(
	doc: Text,
	pos: number,
	currentHunk: Hunk,
	hunks: Hunk[],
): boolean {
	return hunks.some((hunk) => {
		if (hunk.id === currentHunk.id) return false;
		if (hunk.addedLines.length > 0 && pos >= hunk.newFrom && pos < hunk.newTo) {
			return true;
		}
		if (hunk.removedLines.length === 0) return false;

		return pos === doc.lineAt(resolveAnchorPosition(doc, hunk).pos).from;
	});
}

function arraysEqual(left: string[], right: string[]): boolean {
	return (
		left.length === right.length &&
		left.every((value, index) => value === right[index])
	);
}

function clampLineNumber(lineNumber: number, maxLines: number): number {
	if (lineNumber < 1) return 1;
	if (lineNumber > maxLines) return maxLines;
	return lineNumber;
}
