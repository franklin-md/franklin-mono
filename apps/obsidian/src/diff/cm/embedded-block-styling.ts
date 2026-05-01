import { type EditorView, ViewPlugin } from '@codemirror/view';
import type { Hunk } from '../compute-hunks.js';
import { diffField } from './diff-field.js';
import {
	assignEmbeddedSourceBlocks,
	findEmbeddedSourceBlocks,
	findHunkIdForEmbeddedSourceBlock,
	type EmbeddedBlockKind,
	type EmbeddedBlockMatchCandidate,
	type EmbeddedSourceBlock,
} from './embedded-source-blocks.js';
import {
	acceptHunk,
	createActionButtonPair,
	rejectHunks,
} from './react-widgets.js';

export const diffEmbeddedBlockStyling = ViewPlugin.fromClass(
	class {
		constructor(readonly view: EditorView) {
			this.sync();
		}

		update() {
			this.sync();
		}

		destroy() {
			for (const widget of this.view.dom.querySelectorAll<HTMLElement>(
				'.diff-plugin-added-embedded-widget',
			)) {
				clearEmbeddedWidgetState(widget);
			}
		}

		sync() {
			const ds = this.view.state.field(diffField, false);
			const hunks = ds?.hunks ?? [];
			const widgets = Array.from(
				this.view.dom.querySelectorAll<HTMLElement>('.cm-embed-block'),
			);
			const widgetBlocks = matchEmbeddedSourceBlocks(
				this.view,
				widgets,
				findEmbeddedSourceBlocks(this.view.state.doc),
			);

			for (const widget of widgets) {
				if (!isSupportedEmbeddedBlock(widget)) {
					clearEmbeddedWidgetState(widget);
					continue;
				}

				const hunkId = findHunkIdForSourceBlock(
					hunks,
					widgetBlocks.get(widget) ?? null,
				);
				applyEmbeddedWidgetState(widget, hunkId);
				syncEmbeddedActions(
					this.view,
					widget,
					hunkId === null ? null : findHunkById(hunks, hunkId),
				);
			}
		}
	},
);

function matchEmbeddedSourceBlocks(
	view: EditorView,
	widgets: HTMLElement[],
	blocks: EmbeddedSourceBlock[],
): Map<HTMLElement, EmbeddedSourceBlock> {
	const candidates: EmbeddedBlockMatchCandidate<HTMLElement>[] = [];

	for (const widget of widgets) {
		const kind = getEmbeddedWidgetKind(widget);
		if (kind === null) continue;
		candidates.push({
			value: widget,
			kind,
			position: getEmbeddedWidgetPosition(view, widget),
		});
	}

	return assignEmbeddedSourceBlocks(candidates, blocks);
}

function findHunkIdForSourceBlock(
	hunks: Hunk[],
	block: EmbeddedSourceBlock | null,
): string | null {
	return findHunkIdForEmbeddedSourceBlock(hunks, block);
}

function applyEmbeddedWidgetState(
	widget: HTMLElement,
	hunkId: string | null,
): void {
	const variants = getEmbeddedWidgetVariants(widget);

	widget.classList.toggle('diff-plugin-added-embedded-widget', hunkId !== null);
	widget.classList.toggle(
		'diff-plugin-added-table-widget',
		hunkId !== null && variants.table,
	);
	widget.classList.toggle(
		'diff-plugin-added-diagram-widget',
		hunkId !== null && variants.diagram,
	);

	if (hunkId) {
		widget.dataset.diffHunkId = hunkId;
		return;
	}

	delete widget.dataset.diffHunkId;
}

function clearEmbeddedWidgetState(widget: HTMLElement): void {
	widget.classList.remove(
		'diff-plugin-added-embedded-widget',
		'diff-plugin-added-table-widget',
		'diff-plugin-added-diagram-widget',
	);
	delete widget.dataset.diffHunkId;
	removeEmbeddedActions(widget);
}

function isSupportedEmbeddedBlock(widget: HTMLElement): boolean {
	return getEmbeddedWidgetKind(widget) !== null;
}

function getEmbeddedWidgetKind(widget: HTMLElement): EmbeddedBlockKind | null {
	if (
		widget.classList.contains('cm-lang-mermaid') ||
		widget.querySelector('.mermaid') !== null
	) {
		return 'diagram';
	}
	if (
		widget.classList.contains('cm-table-widget') ||
		widget.querySelector('table.table-editor') !== null
	) {
		return 'table';
	}
	return null;
}

function getEmbeddedWidgetVariants(
	widget: HTMLElement,
): Record<EmbeddedBlockKind, boolean> {
	const kind = getEmbeddedWidgetKind(widget);
	return {
		table: kind === 'table',
		diagram: kind === 'diagram',
	};
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

function findHunkById(hunks: Hunk[], hunkId: string): Hunk | null {
	return hunks.find((hunk) => hunk.id === hunkId) ?? null;
}

function syncEmbeddedActions(
	view: EditorView,
	widget: HTMLElement,
	hunk: Hunk | null,
): void {
	if (!hunk) {
		removeEmbeddedActions(widget);
		return;
	}

	let host = widget.querySelector<HTMLElement>(
		':scope > .diff-plugin-embedded-actions-host',
	);
	if (!host) {
		host = activeDocument.createDiv();
		host.className = 'diff-plugin-embedded-actions-host';
		host.dataset.diffHunkId = hunk.id;
		host.addEventListener('mousedown', stopMouseEvent);
		widget.appendChild(host);
	}

	const [accept, reject] = createActionButtonPair(
		hunk.id,
		() => acceptHunk(view, hunk),
		() => rejectHunks(view, [hunk.id]),
	);
	host.replaceChildren(accept, reject);
}

function removeEmbeddedActions(widget: HTMLElement): void {
	widget.querySelector(':scope > .diff-plugin-embedded-actions-host')?.remove();
}

function stopMouseEvent(event: Event): void {
	event.preventDefault();
	event.stopPropagation();
}
