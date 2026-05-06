import { createElement } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import type { Range, Text } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { Decoration, WidgetType } from '@codemirror/view';
import type { Hunk } from '../../compute-hunks.js';
import { stopMouseEvent, stopReactMouseEvent } from './actions.js';
import { areHunksEqual, resolveAnchorPosition } from './utils.js';

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
			widget: new RemovedHunkWidget(hunk),
			block: true,
			side,
		}).range(pos),
	];
}

export class RemovedHunkWidget extends WidgetType {
	private root: Root | null = null;

	constructor(private readonly hunk: Hunk) {
		super();
	}

	eq(other: RemovedHunkWidget): boolean {
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
