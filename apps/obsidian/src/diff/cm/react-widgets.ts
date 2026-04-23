import { createElement } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import type { EditorView } from '@codemirror/view';
import { WidgetType } from '@codemirror/view';
import type { Hunk } from '../compute-hunks.js';
import {
	acceptHunkIntoBaseline,
	diffField,
	reverseHunkChange,
	setBaseline,
	setHoveredHunk,
} from './diff-field.js';

type HunkWidgetProps = {
	hunk: Hunk;
};

export class DiffHunkWidget extends WidgetType {
	private root: Root | null = null;

	constructor(private readonly hunk: Hunk) {
		super();
	}

	eq(other: DiffHunkWidget): boolean {
		return areHunksEqual(this.hunk, other.hunk);
	}

	toDOM(_view: EditorView): HTMLElement {
		const dom = document.createElement('div');
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
		const dom = document.createElement('span');
		dom.className = 'diff-plugin-actions-host';
		dom.dataset.diffHunkId = this.hunk.id;
		dom.addEventListener('mousedown', stopMouseEvent);

		const actions = document.createElement('span');
		actions.className = 'diff-plugin-actions';
		actions.dataset.diffHunkId = this.hunk.id;

		const [accept, reject] = createActionButtonPair(
			this.hunk.id,
			() => acceptHunk(view, this.hunk),
			() => rejectHunks(view, [this.hunk.id]),
		);
		actions.append(accept, reject);
		dom.appendChild(actions);
		return dom;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

export function acceptAllHunks(view: EditorView) {
	const ds = view.state.field(diffField, false);
	if (!ds || ds.oldContent === null) return;
	if (ds.hunks.length === 0) return;

	view.dispatch({
		effects: [
			setBaseline.of({ oldContent: view.state.doc.toString() }),
			setHoveredHunk.of(null),
		],
	});
}

export function acceptHunk(view: EditorView, hunk: Hunk) {
	const ds = view.state.field(diffField, false);
	if (!ds || ds.oldContent === null) return;

	const oldContent = ds.oldContent;
	const newContent = view.state.doc.toString();

	view.dispatch({
		effects: [
			setBaseline.of({
				oldContent: acceptHunkIntoBaseline(oldContent, newContent, hunk),
			}),
			setHoveredHunk.of(null),
		],
	});
}

export function rejectAllHunks(view: EditorView) {
	const ds = view.state.field(diffField, false);
	if (!ds || ds.oldContent === null) return;
	const oldContent = ds.oldContent;
	const pendingHunks = ds.hunks
		.slice()
		.sort((left, right) => left.newFrom - right.newFrom);
	if (pendingHunks.length === 0) return;

	view.dispatch({
		changes: pendingHunks.map((hunk) => reverseHunkChange(oldContent, hunk)),
		effects: [setHoveredHunk.of(null)],
	});
}

export function rejectHunks(view: EditorView, hunkIds: string[]) {
	const ds = view.state.field(diffField, false);
	if (!ds || ds.oldContent === null) return;
	const oldContent = ds.oldContent;

	const hunks = ds.hunks
		.filter((hunk) => hunkIds.includes(hunk.id))
		.sort((left, right) => left.newFrom - right.newFrom);
	if (hunks.length === 0) return;

	view.dispatch({
		changes: hunks.map((hunk) => reverseHunkChange(oldContent, hunk)),
		effects: [setHoveredHunk.of(null)],
	});
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
	const button = document.createElement('button');
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

function stopMouseEvent(event: Event) {
	event.stopPropagation();
}

function stopReactMouseEvent(event: ReactMouseEvent<HTMLElement>) {
	event.preventDefault();
	event.stopPropagation();
}

function stopDomEvent(event: Event) {
	event.preventDefault();
	event.stopPropagation();
}
