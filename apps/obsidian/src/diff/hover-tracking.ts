import type { EditorView } from '@codemirror/view';
import { ViewPlugin } from '@codemirror/view';

import { setHoveredHunkEffect } from './cm/effects.js';
import { diffField } from './cm/diff-field.js';

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

		syncHoveredHunkFromDom(target: EventTarget | null = null) {
			this.setHoveredHunkId(
				findHoveredHunkId(target) ?? findHoveredHunkIdInView(this.view),
			);
		}
	},
	{
		eventHandlers: {
			mousemove(event) {
				this.syncHoveredHunkFromDom(event.target);
			},
			mouseover(event) {
				this.syncHoveredHunkFromDom(event.target);
			},
			mouseenter(event) {
				this.syncHoveredHunkFromDom(event.target);
			},
			focus() {
				this.syncHoveredHunkFromDom();
			},
			mouseleave() {
				this.setHoveredHunkId(null);
			},
		},
	},
);

function findHoveredHunkId(target: EventTarget | null): string | null {
	const element =
		target instanceof Element
			? target
			: target instanceof Node
				? target.parentElement
				: null;
	if (!element) return null;

	const directHunkId =
		element.closest<HTMLElement>('[data-diff-hunk-id]')?.dataset.diffHunkId ??
		null;
	return directHunkId;
}

function hasHoveredEmbeddedWidget(view: EditorView): boolean {
	return (
		view.dom.querySelector('.diff-plugin-added-embedded-widget:hover') !== null
	);
}

function findHoveredHunkIdInView(view: EditorView): string | null {
	if (hasHoveredEmbeddedWidget(view)) {
		return null;
	}

	return (
		view.dom.querySelector<HTMLElement>('[data-diff-hunk-id]:hover')?.dataset
			.diffHunkId ?? null
	);
}
