import { createElement } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import type { Range, Text } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { Decoration, WidgetType } from '@codemirror/view';
import type { Hunk } from '../../compute-hunks.js';
import { acceptHunk } from '../accept-hunk.js';
import { rejectHunk } from '../reject-hunk.js';
import {
	createActionButtonPair,
	stopMouseEvent,
	stopReactMouseEvent,
} from './actions.js';

type HunkWidgetProps = {
	hunk: Hunk;
};

export function removedLineDecorations(
	doc: Text,
	hunk: Hunk,
): Range<Decoration>[] {
	if (hunk.removedLines.length === 0) return [];

	const { pos, side } = resolveAnchorPosition(doc, hunk);
	return [
		Decoration.widget({
			widget: new DiffHunkWidget(hunk),
			block: true,
			side,
		}).range(pos),
	];
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

export class DiffHunkWidget extends WidgetType {
	private root: Root | null = null;

	constructor(private readonly hunk: Hunk) {
		super();
	}

	eq(other: DiffHunkWidget): boolean {
		return areHunksEqual(this.hunk, other.hunk);
	}

	toDOM(_view: EditorView): HTMLElement {
		const dom = activeDocument.createDiv();
		dom.className = 'diff-plugin-widget-host';
		dom.dataset.diffHunkId = this.hunk.id;
		dom.addEventListener('mousedown', stopMouseEvent);

		this.root = createRoot(dom);
		this.root.render(
			createElement(HunkWidget, {
				hunk: this.hunk,
			}),
		);

		return dom;
	}

	destroy(_dom: HTMLElement): void {
		this.root?.unmount();
		this.root = null;
	}

	ignoreEvent(): boolean {
		return true;
	}
}

function HunkWidget({ hunk }: HunkWidgetProps) {
	const hasRemovedLines = hunk.removedLines.length > 0;

	return createElement(
		'section',
		{
			className: 'diff-plugin-widget',
			'data-diff-hunk-id': hunk.id,
			onMouseDown: stopReactMouseEvent,
		},
		hasRemovedLines
			? createElement(
					'div',
					{ className: 'diff-plugin-removed-block' },
					...hunk.removedLines.map((line, index) =>
						createElement(
							'div',
							{
								key: `${hunk.id}:${index}`,
								className: 'diff-plugin-removed-line',
							},
							line.length === 0 ? '\u200b' : line,
						),
					),
				)
			: null,
	);
}

export class DiffHunkActionsWidget extends WidgetType {
	constructor(private readonly hunk: Hunk) {
		super();
	}

	eq(other: DiffHunkActionsWidget): boolean {
		return areHunksEqual(this.hunk, other.hunk);
	}

	toDOM(view: EditorView): HTMLElement {
		const dom = activeDocument.createSpan();
		dom.className = 'diff-plugin-actions-host';
		dom.dataset.diffHunkId = this.hunk.id;
		dom.addEventListener('mousedown', stopMouseEvent);

		const actions = activeDocument.createSpan();
		actions.className = 'diff-plugin-actions';
		actions.dataset.diffHunkId = this.hunk.id;

		const [accept, reject] = createActionButtonPair(
			this.hunk.id,
			() => acceptHunk(view, this.hunk),
			() => rejectHunk(view, [this.hunk.id]),
		);
		actions.append(accept, reject);
		dom.appendChild(actions);
		return dom;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

function areHunksEqual(left: Hunk, right: Hunk): boolean {
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
