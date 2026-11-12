import { type EditorView, type ViewUpdate, ViewPlugin } from '@codemirror/view';
import type { Hunk } from '../../../compute-hunks.js';
import { diffField } from '../../diff-field.js';

const ADDED_EMBEDDED_WIDGET_CLASS = 'diff-plugin-added-embedded-widget';
const ADDED_HORIZONTAL_RULE_CLASS = 'diff-plugin-added-horizontal-rule';
const ADDED_QUOTE_BLOCK_CLASS = 'diff-plugin-added-quote-block';
const EMBEDDED_PADDING_LEFT_PROPERTY = '--diff-plugin-embed-padding-left';
const EMBEDDED_PADDING_RIGHT_PROPERTY = '--diff-plugin-embed-padding-right';
const HORIZONTAL_RULE_PADDING_LEFT_PROPERTY = '--diff-plugin-hr-padding-left';
const HORIZONTAL_RULE_PADDING_RIGHT_PROPERTY = '--diff-plugin-hr-padding-right';
const QUOTE_BACKGROUND_COLOR_PROPERTY = 'background-color';

export const diffEmbeddedBlockStyling = ViewPlugin.fromClass(
	class {
		readonly mutationObserver: MutationObserver | null;
		syncFrame: number | null = null;

		constructor(readonly view: EditorView) {
			this.mutationObserver = createMutationObserver(view, () => {
				this.scheduleSync();
			});
			this.sync();
		}

		update(update: ViewUpdate) {
			const prev = update.startState.field(diffField, false);
			const next = update.state.field(diffField, false);
			if (
				!update.docChanged &&
				!update.selectionSet &&
				!update.viewportChanged &&
				prev === next
			)
				return;

			this.scheduleSync();
		}

		destroy() {
			this.mutationObserver?.disconnect();
			this.cancelScheduledSync();

			for (const widget of findEmbeddedWidgets(this.view)) {
				clearEmbeddedWidgetState(widget);
			}
			for (const horizontalRule of findHorizontalRules(this.view)) {
				clearHorizontalRuleState(horizontalRule);
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

			for (const horizontalRule of findHorizontalRules(this.view)) {
				const position = getElementPosition(this.view, horizontalRule);
				const hunkId =
					position === null ? null : findAddedHunkIdAtPosition(hunks, position);

				applyHorizontalRuleState(horizontalRule, hunkId);
			}

			for (const quoteBlock of findQuoteBlocks(this.view)) {
				const position = getElementPosition(this.view, quoteBlock);
				const hunkId =
					position === null ? null : findAddedHunkIdAtPosition(hunks, position);

				applyQuoteBlockState(quoteBlock, hunkId);
			}
		}

		scheduleSync() {
			if (this.syncFrame !== null) return;

			const win = this.view.dom.ownerDocument.defaultView;
			if (!win) {
				this.sync();
				return;
			}

			this.syncFrame = win.requestAnimationFrame(() => {
				this.syncFrame = null;
				this.sync();
			});
		}

		cancelScheduledSync() {
			if (this.syncFrame === null) return;

			this.view.dom.ownerDocument.defaultView?.cancelAnimationFrame(
				this.syncFrame,
			);
			this.syncFrame = null;
		}
	},
);

function createMutationObserver(
	view: EditorView,
	onMutation: () => void,
): MutationObserver | null {
	const win = view.dom.ownerDocument.defaultView;
	if (!win) return null;

	const observer = new win.MutationObserver(onMutation);
	observer.observe(view.dom, {
		childList: true,
		subtree: true,
	});
	return observer;
}

function findEmbeddedWidgets(view: EditorView): HTMLElement[] {
	return Array.from(view.dom.querySelectorAll<HTMLElement>('.cm-embed-block'));
}

function findHorizontalRules(view: EditorView): HTMLElement[] {
	return Array.from(
		view.dom.querySelectorAll<HTMLElement>(
			`.hr.cm-line, .${ADDED_HORIZONTAL_RULE_CLASS}`,
		),
	);
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

function applyHorizontalRuleState(
	horizontalRule: HTMLElement,
	hunkId: string | null,
): void {
	if (hunkId === null) {
		clearHorizontalRuleState(horizontalRule);
		return;
	}

	horizontalRule.classList.add(ADDED_HORIZONTAL_RULE_CLASS);
	horizontalRule.dataset.diffHunkId = hunkId;
	syncHorizontalRulePadding(horizontalRule);
}

function clearHorizontalRuleState(horizontalRule: HTMLElement): void {
	horizontalRule.classList.remove(ADDED_HORIZONTAL_RULE_CLASS);
	delete horizontalRule.dataset.diffHunkId;
	horizontalRule.style.removeProperty(HORIZONTAL_RULE_PADDING_LEFT_PROPERTY);
	horizontalRule.style.removeProperty(HORIZONTAL_RULE_PADDING_RIGHT_PROPERTY);
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

function syncHorizontalRulePadding(horizontalRule: HTMLElement): void {
	const style = getComputedStyle(horizontalRule);
	horizontalRule.style.setProperty(
		HORIZONTAL_RULE_PADDING_LEFT_PROPERTY,
		style.paddingLeft,
	);
	horizontalRule.style.setProperty(
		HORIZONTAL_RULE_PADDING_RIGHT_PROPERTY,
		style.paddingRight,
	);
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
