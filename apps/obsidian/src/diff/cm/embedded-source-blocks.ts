import type { Text } from '@codemirror/state';
import type { Hunk } from '../compute-hunks.js';

export type EmbeddedBlockKind = 'diagram' | 'table';

type SourceRange = {
	from: number;
	to: number;
};

export type EmbeddedSourceBlock = SourceRange & {
	kind: EmbeddedBlockKind;
};

export type EmbeddedBlockMatchCandidate<T> = {
	kind: EmbeddedBlockKind;
	position: number | null;
	value: T;
};

export function findVisibleEmbeddedSourceBlocks(
	doc: Text,
	visibleRanges: readonly SourceRange[],
): EmbeddedSourceBlock[] {
	return findEmbeddedSourceBlocks(doc).filter((block) =>
		visibleRanges.some((range) => rangesOverlap(block, range)),
	);
}

export function findEmbeddedSourceBlocks(doc: Text): EmbeddedSourceBlock[] {
	const blocks: EmbeddedSourceBlock[] = [];

	let lineNumber = 1;
	while (lineNumber <= doc.lines) {
		const line = doc.line(lineNumber);
		const mermaidBlock = findMermaidBlock(doc, lineNumber, line.text);
		if (mermaidBlock) {
			blocks.push(mermaidBlock.block);
			lineNumber = mermaidBlock.nextLineNumber;
			continue;
		}

		const tableBlock = findTableBlock(doc, lineNumber, line.text);
		if (tableBlock) {
			blocks.push(tableBlock.block);
			lineNumber = tableBlock.nextLineNumber;
			continue;
		}

		lineNumber++;
	}

	return blocks;
}

export function findHunkIdForEmbeddedSourceBlock(
	hunks: Hunk[],
	block: EmbeddedSourceBlock | null,
): string | null {
	if (block === null) return null;

	for (const hunk of hunks) {
		if (hunk.addedLines.length === 0) continue;
		if (rangesOverlap(block, { from: hunk.newFrom, to: hunk.newTo })) {
			return hunk.id;
		}
	}

	return null;
}

export function assignEmbeddedSourceBlocks<T>(
	candidates: readonly EmbeddedBlockMatchCandidate<T>[],
	blocks: readonly EmbeddedSourceBlock[],
): Map<T, EmbeddedSourceBlock> {
	const assignments = new Map<T, EmbeddedSourceBlock>();
	const remainingByKind = new Map<EmbeddedBlockKind, EmbeddedSourceBlock[]>();

	for (const kind of ['diagram', 'table'] as const) {
		remainingByKind.set(
			kind,
			blocks.filter((block) => block.kind === kind).slice(),
		);
	}

	for (const candidate of candidates) {
		const remaining = remainingByKind.get(candidate.kind);
		if (!remaining || remaining.length === 0) continue;

		const blockIndex = findBestBlockIndex(remaining, candidate.position);
		const [block] = remaining.splice(blockIndex, 1);
		if (!block) continue;
		assignments.set(candidate.value, block);
	}

	return assignments;
}

function findMermaidBlock(
	doc: Text,
	lineNumber: number,
	lineText: string,
): {
	block: EmbeddedSourceBlock;
	nextLineNumber: number;
} | null {
	if (!isOpeningFence(lineText, 'mermaid')) return null;

	let endLineNumber = lineNumber;
	for (let cursor = lineNumber + 1; cursor <= doc.lines; cursor++) {
		endLineNumber = cursor;
		if (isClosingFence(doc.line(cursor).text)) {
			break;
		}
	}

	return {
		block: {
			kind: 'diagram',
			from: doc.line(lineNumber).from,
			to: lineEndExclusive(doc, endLineNumber),
		},
		nextLineNumber: endLineNumber + 1,
	};
}

function findTableBlock(
	doc: Text,
	lineNumber: number,
	lineText: string,
): {
	block: EmbeddedSourceBlock;
	nextLineNumber: number;
} | null {
	if (lineNumber >= doc.lines) return null;
	if (!looksLikeTableRow(lineText)) return null;
	if (!looksLikeTableDivider(doc.line(lineNumber + 1).text)) return null;

	let endLineNumber = lineNumber + 1;
	for (let cursor = lineNumber + 2; cursor <= doc.lines; cursor++) {
		if (!looksLikeTableRow(doc.line(cursor).text)) break;
		endLineNumber = cursor;
	}

	return {
		block: {
			kind: 'table',
			from: doc.line(lineNumber).from,
			to: lineEndExclusive(doc, endLineNumber),
		},
		nextLineNumber: endLineNumber + 1,
	};
}

function isOpeningFence(lineText: string, language: string): boolean {
	const match = lineText.trim().match(/^```(\S+)?$/);
	return match?.[1]?.toLowerCase() === language;
}

function isClosingFence(lineText: string): boolean {
	return /^```\s*$/.test(lineText.trim());
}

export function looksLikeTableRow(lineText: string): boolean {
	const trimmed = lineText.trim();
	return trimmed.includes('|') && trimmed.replaceAll('|', '').trim().length > 0;
}

export function looksLikeTableDivider(lineText: string): boolean {
	return /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(lineText);
}

function lineEndExclusive(doc: Text, lineNumber: number): number {
	return lineNumber < doc.lines ? doc.line(lineNumber + 1).from : doc.length;
}

function findBestBlockIndex(
	blocks: readonly EmbeddedSourceBlock[],
	position: number | null,
): number {
	if (position === null) return 0;

	let bestIndex = 0;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const [index, block] of blocks.entries()) {
		const distance = distanceToRange(position, block);
		if (distance < bestDistance) {
			bestIndex = index;
			bestDistance = distance;
		}
	}

	return bestIndex;
}

function distanceToRange(position: number, range: SourceRange): number {
	if (position < range.from) return range.from - position;
	if (position > range.to) return position - range.to;
	return 0;
}

function rangesOverlap(left: SourceRange, right: SourceRange): boolean {
	return left.from < right.to && right.from < left.to;
}
