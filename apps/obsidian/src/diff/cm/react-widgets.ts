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
	setBaselineEffect,
	setHoveredHunkEffect,
} from './diff-field.js';

type HunkWidgetProps = {
	hunk: Hunk;
};

type HunkActionsWidgetProps = {
	hunkId: string;
	onAccept: () => void;
	onReject: () => void;
};

type ToolbarWidgetProps = {
	pendingCount: number;
	onAcceptAll: () => void;
	onRejectAll: () => void;
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
		return false;
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
	private root: Root | null = null;

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

		this.root = createRoot(dom);
		this.root.render(
			createElement(HunkActionsWidget, {
				hunkId: this.hunk.id,
				onAccept: () => {
					acceptHunk(view, this.hunk);
				},
				onReject: () => {
					rejectHunks(view, [this.hunk.id]);
				},
			}),
		);

		return dom;
	}

	destroy(_dom: HTMLElement): void {
		this.root?.unmount();
		this.root = null;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

function HunkActionsWidget({
	hunkId,
	onAccept,
	onReject,
}: HunkActionsWidgetProps) {
	return createElement(
		'span',
		{ className: 'diff-plugin-actions', 'data-diff-hunk-id': hunkId },
		createElement(
			'button',
			{
				type: 'button',
				className: 'diff-plugin-btn diff-plugin-btn-accept',
				onMouseDown: stopReactMouseEvent,
				onClick: onAccept,
			},
			'Accept',
		),
		createElement(
			'button',
			{
				type: 'button',
				className: 'diff-plugin-btn diff-plugin-btn-reject',
				onMouseDown: stopReactMouseEvent,
				onClick: onReject,
			},
			'Reject',
		),
	);
}

export class DiffToolbarWidget extends WidgetType {
	private root: Root | null = null;

	constructor(private readonly pendingCount: number) {
		super();
	}

	eq(other: DiffToolbarWidget): boolean {
		return other.pendingCount === this.pendingCount;
	}

	toDOM(view: EditorView): HTMLElement {
		const dom = document.createElement('div');
		dom.className = 'diff-plugin-toolbar-host';
		dom.addEventListener('mousedown', stopMouseEvent);

		this.root = createRoot(dom);
		this.root.render(
			createElement(Toolbar, {
				pendingCount: this.pendingCount,
				onAcceptAll: () => acceptAllHunks(view),
				onRejectAll: () => rejectAllHunks(view),
			}),
		);

		return dom;
	}

	destroy(_dom: HTMLElement): void {
		this.root?.unmount();
		this.root = null;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

function Toolbar({
	pendingCount,
	onAcceptAll,
	onRejectAll,
}: ToolbarWidgetProps) {
	const label = `${pendingCount} pending change${pendingCount === 1 ? '' : 's'}`;
	return createElement(
		'div',
		{ className: 'diff-plugin-toolbar', onMouseDown: stopReactMouseEvent },
		createElement('span', { className: 'diff-plugin-toolbar-label' }, label),
		createElement(
			'button',
			{
				type: 'button',
				className: 'diff-plugin-btn diff-plugin-btn-all',
				onMouseDown: stopReactMouseEvent,
				onClick: onAcceptAll,
			},
			'Accept All',
		),
		createElement(
			'button',
			{
				type: 'button',
				className: 'diff-plugin-btn diff-plugin-btn-all',
				onMouseDown: stopReactMouseEvent,
				onClick: onRejectAll,
			},
			'Reject All',
		),
	);
}

export function acceptAllHunks(view: EditorView) {
	const ds = view.state.field(diffField, false);
	if (!ds || ds.oldContent === null) return;
	if (ds.hunks.length === 0) return;

	view.dispatch({
		effects: [
			setBaselineEffect.of({ oldContent: view.state.doc.toString() }),
			setHoveredHunkEffect.of(null),
		],
	});
}

function acceptHunk(view: EditorView, hunk: Hunk) {
	const ds = view.state.field(diffField, false);
	if (!ds || ds.oldContent === null) return;

	const oldContent = ds.oldContent;
	const newContent = view.state.doc.toString();

	view.dispatch({
		effects: [
			setBaselineEffect.of({
				oldContent: acceptHunkIntoBaseline(oldContent, newContent, hunk),
			}),
			setHoveredHunkEffect.of(null),
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
		effects: [setHoveredHunkEffect.of(null)],
	});
}

function rejectHunks(view: EditorView, hunkIds: string[]) {
	const ds = view.state.field(diffField, false);
	if (!ds || ds.oldContent === null) return;
	const oldContent = ds.oldContent;

	const hunks = ds.hunks
		.filter((hunk) => hunkIds.includes(hunk.id))
		.sort((left, right) => left.newFrom - right.newFrom);
	if (hunks.length === 0) return;

	view.dispatch({
		changes: hunks.map((hunk) => reverseHunkChange(oldContent, hunk)),
		effects: [setHoveredHunkEffect.of(null)],
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

function stopMouseEvent(event: Event) {
	event.stopPropagation();
}

function stopReactMouseEvent(event: ReactMouseEvent<HTMLElement>) {
	event.preventDefault();
	event.stopPropagation();
}
