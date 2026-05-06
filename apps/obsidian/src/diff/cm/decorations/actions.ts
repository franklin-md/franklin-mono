import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Range, Text } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { Decoration, WidgetType } from '@codemirror/view';
import type { Hunk } from '../../compute-hunks.js';
import {
	areHunksEqual,
	hunkHasEmbeddedActions,
	resolveActionPosition,
} from './utils.js';
import { acceptHunk } from '../accept-hunk.js';
import { rejectHunk } from '../reject-hunk.js';

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

export class DiffHunkActionsWidget extends WidgetType {
	constructor(private readonly hunk: Hunk) {
		super();
	}

	eq(other: DiffHunkActionsWidget): boolean {
		return areHunksEqual(this.hunk, other.hunk);
	}

	toDOM(view: EditorView): HTMLElement {
		const dom = activeDocument.createElement('span');
		dom.className = 'diff-plugin-actions-host';
		dom.dataset.diffHunkId = this.hunk.id;
		dom.addEventListener('mousedown', stopMouseEvent);

		const actions = activeDocument.createElement('span');
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
	const button = activeDocument.createElement('button');
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
