import { type EditorView, type ViewUpdate, ViewPlugin } from '@codemirror/view';
import type { Hunk } from '../../../compute-hunks.js';
import { diffField } from '../../diff-field.js';

const ADDED_EMBEDDED_WIDGET_CLASS = 'diff-plugin-added-embedded-widget';
const ADDED_QUOTE_BLOCK_CLASS = 'diff-plugin-added-quote-block';
const EMBEDDED_PADDING_LEFT_PROPERTY = '--diff-plugin-embed-padding-left';
const EMBEDDED_PADDING_RIGHT_PROPERTY = '--diff-plugin-embed-padding-right';
const QUOTE_BACKGROUND_COLOR_PROPERTY = 'background-color';

export const diffEmbeddedBlockStyling = ViewPlugin.fromClass(
	class {
		constructor(readonly view: EditorView) {
			this.sync();
		}

		update(update: ViewUpdate) {
			const prev = update.startState.field(diffField, false);
			const next = update.state.field(diffField, false);
			if (!update.docChanged && !update.viewportChanged && prev === next)
				return;

			this.sync();
		}

		destroy() {
			for (const widget of findEmbeddedWidgets(this.view)) {
				clearEmbeddedWidgetState(widget);
			}
			for (const quoteBlock of findQuoteBlocks(this.view)) {
				clearQuoteBlockState(quoteBlock);
			}
		}

		sync() {
			const ds = this.view.state.field(diffField, false);
			const hunks = ds?.hunks ?? [];

			for (const widget of findEmbeddedWidgets(this.view)) {
				const position = getElementPosition(this.view, widget);
				const hunkId =
					position === null ? null : findAddedHunkIdAtPosition(hunks, position);

				applyEmbeddedWidgetState(widget, hunkId);
			}

			for (const quoteBlock of findQuoteBlocks(this.view)) {
				const position = getElementPosition(this.view, quoteBlock);
				const hunkId =
					position === null ? null : findAddedHunkIdAtPosition(hunks, position);

				applyQuoteBlockState(quoteBlock, hunkId);
			}
		}
	},
);

function findEmbeddedWidgets(view: EditorView): HTMLElement[] {
	return Array.from(view.dom.querySelectorAll<HTMLElement>('.cm-embed-block'));
}

function findQuoteBlocks(view: EditorView): HTMLElement[] {
	return Array.from(
		view.dom.querySelectorAll<HTMLElement>(
			`.HyperMD-quote, .${ADDED_QUOTE_BLOCK_CLASS}`,
		),
	);
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

function applyQuoteBlockState(
	quoteBlock: HTMLElement,
	hunkId: string | null,
): void {
	if (hunkId === null) {
		clearQuoteBlockState(quoteBlock);
		return;
	}

	quoteBlock.classList.add(ADDED_QUOTE_BLOCK_CLASS);
	quoteBlock.setCssProps({
		[QUOTE_BACKGROUND_COLOR_PROPERTY]: 'var(--diff-plugin-added-bg)',
	});
}

function clearQuoteBlockState(quoteBlock: HTMLElement): void {
	if (!quoteBlock.classList.contains(ADDED_QUOTE_BLOCK_CLASS)) return;

	quoteBlock.classList.remove(ADDED_QUOTE_BLOCK_CLASS);
	quoteBlock.style.removeProperty(QUOTE_BACKGROUND_COLOR_PROPERTY);
}

function syncEmbeddedWidgetPadding(widget: HTMLElement): void {
	const style = getComputedStyle(widget);
	widget.style.setProperty(EMBEDDED_PADDING_LEFT_PROPERTY, style.paddingLeft);
	widget.style.setProperty(EMBEDDED_PADDING_RIGHT_PROPERTY, style.paddingRight);
}

function getElementPosition(
	view: EditorView,
	element: HTMLElement,
): number | null {
	try {
		return view.posAtDOM(element, 0);
	} catch {
		return null;
	}
}
