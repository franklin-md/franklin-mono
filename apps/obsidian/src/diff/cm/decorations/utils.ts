import type { Text } from '@codemirror/state';
import type { Hunk } from '../../compute-hunks.js';

export type ActionPosition =
	| { kind: 'inline'; pos: number }
	| { kind: 'block'; pos: number };

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

export function resolveActionPosition(doc: Text, hunk: Hunk): ActionPosition {
	const cmLineNumber = lineBelowHunk(hunk);
	if (cmLineNumber !== null && cmLineNumber <= doc.lines) {
		return { kind: 'inline', pos: doc.line(cmLineNumber).from };
	}
	return { kind: 'block', pos: doc.length };
}

function lineBelowHunk(hunk: Hunk): number | null {
	if (hunk.addedLines.length > 0) {
		return hunk.newToLine + 1;
	}
	if (hunk.anchor.placement === 'after') {
		return hunk.anchor.lineIndex + 2;
	}
	return hunk.anchor.lineIndex + 1;
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
