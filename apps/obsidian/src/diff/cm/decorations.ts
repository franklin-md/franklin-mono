import type { EditorState, Range, Text } from '@codemirror/state';
import { StateField } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import type { Hunk } from '../compute-hunks.js';
import { diffField, setHoveredHunkEffect } from './diff-field.js';
import {
	looksLikeTableDivider,
	looksLikeTableRow,
} from './embedded-source-blocks.js';
import { DiffHunkActionsWidget, DiffHunkWidget } from './react-widgets.js';

function buildDecorations(state: EditorState): DecorationSet {
	const ds = state.field(diffField, false);
	const decorations: Range<Decoration>[] = [];
	if (!ds || ds.oldContent === null) return Decoration.none;

	const hoveredHunkId = ds.hoveredHunkId;
	const visible: Hunk[] = ds.hunks
		.slice()
		.sort(
			(left, right) =>
				left.anchor.lineIndex - right.anchor.lineIndex ||
				left.newFrom - right.newFrom,
		);

	for (const hunk of visible) {
		addAddedLineDecorations(decorations, state.doc, hunk);

		if (hunk.removedLines.length > 0) {
			const { pos, side } = resolveAnchorPosition(state.doc, hunk);
			decorations.push(
				Decoration.widget({
					widget: new DiffHunkWidget(hunk),
					block: true,
					side,
				}).range(pos),
			);
		}

		if (hoveredHunkId === hunk.id && !hunkHasEmbeddedActions(hunk)) {
			decorations.push(
				Decoration.widget({
					widget: new DiffHunkActionsWidget(hunk),
					side: 1,
				}).range(resolveActionPosition(state.doc, hunk, visible)),
			);
		}
	}

	return Decoration.set(decorations, true);
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

function addAddedLineDecorations(
	decorations: Range<Decoration>[],
	doc: Text,
	hunk: Hunk,
) {
	if (hunk.addedLines.length === 0) return;

	const addedEnd = Math.min(hunk.newTo, doc.length);
	if (hunk.newFrom >= addedEnd) return;

	let cursor = hunk.newFrom;
	let lineNo = 0;
	const totalLines = countAddedLines(doc, hunk.newFrom, addedEnd);

	while (cursor < addedEnd) {
		const line = doc.lineAt(cursor);
		const isFirst = lineNo === 0;
		const isLast = lineNo === totalLines - 1;
		const classes = [
			'diff-plugin-added-line',
			isFirst ? 'diff-plugin-added-first' : '',
			isLast ? 'diff-plugin-added-last' : '',
		]
			.filter(Boolean)
			.join(' ');

		decorations.push(
			Decoration.line({
				class: classes,
				attributes: {
					'data-diff-hunk-id': hunk.id,
				},
			}).range(line.from),
		);

		if (line.to >= addedEnd - 1) break;
		cursor = line.to + 1;
		lineNo++;
	}
}

function countAddedLines(doc: Text, from: number, to: number): number {
	if (from >= to) return 0;
	const start = doc.lineAt(from).number;
	const end = doc.lineAt(Math.min(to - 1, doc.length)).number;
	return end - start + 1;
}

function resolveAnchorPosition(
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

function findHoveredHunkId(target: EventTarget | null): string | null {
	const element =
		target instanceof Element
			? target
			: target instanceof Node
				? target.parentElement
				: null;
	if (!element) return null;

	const directHunkId =
		element.closest<HTMLElement>('[data-diff-hunk-id]')?.dataset.diffHunkId ??
		null;
	return directHunkId;
}

function isEmbeddedHoverTarget(target: EventTarget | null): boolean {
	const element =
		target instanceof Element
			? target
			: target instanceof Node
				? target.parentElement
				: null;
	if (!element) return false;

	return (
		element.closest(
			'.diff-plugin-added-embedded-widget, .diff-plugin-embedded-actions-host',
		) !== null
	);
}

function hasHoveredEmbeddedWidget(view: EditorView): boolean {
	return (
		view.dom.querySelector(
			'.diff-plugin-added-embedded-widget:hover, .diff-plugin-embedded-actions-host:hover',
		) !== null
	);
}

function findHoveredHunkIdInView(view: EditorView): string | null {
	if (hasHoveredEmbeddedWidget(view)) {
		return null;
	}

	return (
		view.dom.querySelector<HTMLElement>('[data-diff-hunk-id]:hover')?.dataset
			.diffHunkId ?? null
	);
}

export const diffHoverTracking = ViewPlugin.fromClass(
	class {
		hoveredHunkId: string | null = null;

		constructor(readonly view: EditorView) {}

		update() {
			const hoveredHunkId =
				this.view.state.field(diffField, false)?.hoveredHunkId ?? null;
			this.hoveredHunkId = hoveredHunkId;
		}

		setHoveredHunkId(next: string | null) {
			if (this.hoveredHunkId === next) return;
			this.hoveredHunkId = next;
			this.view.dispatch({ effects: setHoveredHunkEffect.of(next) });
		}

		syncHoveredHunkFromDom(target: EventTarget | null = null) {
			if (
				isEmbeddedHoverTarget(target) ||
				hasHoveredEmbeddedWidget(this.view)
			) {
				this.setHoveredHunkId(null);
				return;
			}

			this.setHoveredHunkId(
				findHoveredHunkId(target) ?? findHoveredHunkIdInView(this.view),
			);
		}
	},
	{
		eventHandlers: {
			mousemove(event) {
				this.syncHoveredHunkFromDom(event.target);
			},
			mouseover(event) {
				this.syncHoveredHunkFromDom(event.target);
			},
			mouseenter(event) {
				this.syncHoveredHunkFromDom(event.target);
			},
			focus() {
				this.syncHoveredHunkFromDom();
			},
			mouseleave() {
				this.setHoveredHunkId(null);
			},
		},
	},
);

export const diffDecorations = StateField.define<DecorationSet>({
	create: (state) => buildDecorations(state),
	update: (value, tr) => {
		const prev = tr.startState.field(diffField, false);
		const next = tr.state.field(diffField, false);
		if (tr.docChanged || prev !== next) {
			return buildDecorations(tr.state);
		}
		return value;
	},
	provide: (field) => EditorView.decorations.from(field),
});
