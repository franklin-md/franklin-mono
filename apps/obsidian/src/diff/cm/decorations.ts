import type { EditorState, Text } from '@codemirror/state';
import { type Range, StateField } from '@codemirror/state';
import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
} from '@codemirror/view';
import type { Hunk } from '../compute-hunks.js';
import { diffField, setHoveredHunkEffect } from './diff-field.js';
import { DiffHunkWidget } from './react-widgets.js';

function buildDecorations(state: EditorState): DecorationSet {
	const ds = state.field(diffField, false);
	const decorations: Range<Decoration>[] = [];
	if (!ds || ds.oldContent === null) return Decoration.none;

	const hoveredHunkId = ds.hoveredHunkId;
	const visible: Hunk[] = ds.hunks
		.filter((hunk) => ds.status.get(hunk.id) === 'pending')
		.slice()
		.sort(
			(left, right) =>
				left.anchor.lineIndex - right.anchor.lineIndex ||
				left.newFrom - right.newFrom,
		);

	for (const hunk of visible) {
		addAddedLineDecorations(decorations, state.doc, hunk);

		const shouldRenderWidget =
			hunk.removedLines.length > 0 || hoveredHunkId === hunk.id;
		if (!shouldRenderWidget) continue;

		const { pos, side } = resolveAnchorPosition(state.doc, hunk);
		decorations.push(
			Decoration.widget({
				widget: new DiffHunkWidget(hunk, hoveredHunkId === hunk.id),
				block: true,
				side,
			}).range(pos),
		);
	}

	return Decoration.set(decorations, true);
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
	return (
		element?.closest<HTMLElement>('[data-diff-hunk-id]')?.dataset.diffHunkId ??
		null
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
	},
	{
		eventHandlers: {
			mousemove(event) {
				this.setHoveredHunkId(findHoveredHunkId(event.target));
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
