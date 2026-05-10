import { type EditorView, ViewPlugin } from '@codemirror/view';
import type { Hunk } from '../../../compute-hunks.js';
import { diffField } from '../../diff-field.js';

const ADDED_EMBEDDED_WIDGET_CLASS = 'diff-plugin-added-embedded-widget';
const EMBEDDED_PADDING_LEFT_PROPERTY = '--diff-plugin-embed-padding-left';
const EMBEDDED_PADDING_RIGHT_PROPERTY = '--diff-plugin-embed-padding-right';

export const diffEmbeddedBlockStyling = ViewPlugin.fromClass(
	class {
		constructor(readonly view: EditorView) {
			this.sync();
		}

		update() {
			this.sync();
		}

		destroy() {
			for (const widget of findEmbeddedWidgets(this.view)) {
				clearEmbeddedWidgetState(widget);
			}
		}

		sync() {
			const ds = this.view.state.field(diffField, false);
			const hunks = ds?.hunks ?? [];

			for (const widget of findEmbeddedWidgets(this.view)) {
				const position = getEmbeddedWidgetPosition(this.view, widget);
				const hunkId =
					position === null ? null : findAddedHunkIdAtPosition(hunks, position);

				applyEmbeddedWidgetState(widget, hunkId);
			}
		}
	},
);

function findEmbeddedWidgets(view: EditorView): HTMLElement[] {
	return Array.from(view.dom.querySelectorAll<HTMLElement>('.cm-embed-block'));
}

function findAddedHunkIdAtPosition(
	hunks: readonly Hunk[],
	position: number,
): string | null {
	for (const hunk of hunks) {
		if (hunk.addedLines.length === 0) continue;
		if (position >= hunk.newFrom && position < hunk.newTo) {
			return hunk.id;
		}
	}

	return null;
}

function applyEmbeddedWidgetState(
	widget: HTMLElement,
	hunkId: string | null,
): void {
	if (hunkId === null) {
		clearEmbeddedWidgetState(widget);
		return;
	}

	widget.classList.add(ADDED_EMBEDDED_WIDGET_CLASS);
	widget.dataset.diffHunkId = hunkId;
	syncEmbeddedWidgetPadding(widget);
}

function clearEmbeddedWidgetState(widget: HTMLElement): void {
	widget.classList.remove(ADDED_EMBEDDED_WIDGET_CLASS);
	delete widget.dataset.diffHunkId;
	widget.style.removeProperty(EMBEDDED_PADDING_LEFT_PROPERTY);
	widget.style.removeProperty(EMBEDDED_PADDING_RIGHT_PROPERTY);
}

function syncEmbeddedWidgetPadding(widget: HTMLElement): void {
	const style = getComputedStyle(widget);
	widget.style.setProperty(EMBEDDED_PADDING_LEFT_PROPERTY, style.paddingLeft);
	widget.style.setProperty(EMBEDDED_PADDING_RIGHT_PROPERTY, style.paddingRight);
}

function getEmbeddedWidgetPosition(
	view: EditorView,
	widget: HTMLElement,
): number | null {
	try {
		return view.posAtDOM(widget, 0);
	} catch {
		return null;
	}
}
