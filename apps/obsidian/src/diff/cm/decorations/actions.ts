import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Range, Text } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import type { Hunk } from '../../compute-hunks.js';
import {
	looksLikeTableDivider,
	looksLikeTableRow,
} from '../embedded-source-blocks.js';
import {
	DiffHunkActionsWidget,
	resolveAnchorPosition,
} from './deleted-line.js';

export function actionDecorations(
	doc: Text,
	hunk: Hunk,
	visibleHunks: Hunk[],
	hoveredHunkId: string | null,
): Range<Decoration>[] {
	if (hoveredHunkId !== hunk.id || hunkHasEmbeddedActions(hunk)) return [];

	return [
		Decoration.widget({
			widget: new DiffHunkActionsWidget(hunk),
			side: 1,
		}).range(resolveActionPosition(doc, hunk, visibleHunks)),
	];
}

function hunkHasEmbeddedActions(hunk: Hunk): boolean {
	return hunkContainsMermaidBlock(hunk) || hunkContainsTableBlock(hunk);
}

function hunkContainsMermaidBlock(hunk: Hunk): boolean {
	return hunk.addedLines.some((line) => /^```mermaid\s*$/i.test(line.trim()));
}

function hunkContainsTableBlock(hunk: Hunk): boolean {
	for (let index = 0; index < hunk.addedLines.length - 1; index++) {
		const line = hunk.addedLines[index];
		const nextLine = hunk.addedLines[index + 1];
		if (!line || !nextLine) continue;
		if (!looksLikeTableRow(line)) continue;
		if (!looksLikeTableDivider(nextLine)) continue;
		return true;
	}

	return false;
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

function clampLineNumber(lineNumber: number, maxLines: number): number {
	if (lineNumber < 1) return 1;
	if (lineNumber > maxLines) return maxLines;
	return lineNumber;
}

export function createActionButtonPair(
	hunkId: string,
	onAccept: () => void,
	onReject: () => void,
): [HTMLButtonElement, HTMLButtonElement] {
	return [
		createActionButton('Accept', 'diff-plugin-btn-accept', hunkId, onAccept),
		createActionButton('Reject', 'diff-plugin-btn-reject', hunkId, onReject),
	];
}

function createActionButton(
	label: string,
	variantClass: string,
	hunkId: string,
	onClick: () => void,
): HTMLButtonElement {
	const button = activeDocument.createEl('button');
	button.type = 'button';
	button.className = `diff-plugin-btn ${variantClass}`;
	button.dataset.diffHunkId = hunkId;
	button.textContent = label;
	button.addEventListener('mousedown', stopDomEvent);
	button.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		onClick();
	});
	return button;
}

export function stopMouseEvent(event: Event) {
	event.stopPropagation();
}

export function stopReactMouseEvent(event: ReactMouseEvent<HTMLElement>) {
	event.preventDefault();
	event.stopPropagation();
}

function stopDomEvent(event: Event) {
	event.preventDefault();
	event.stopPropagation();
}
