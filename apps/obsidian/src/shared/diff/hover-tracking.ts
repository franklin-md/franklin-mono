import type { EditorView } from '@codemirror/view';
import { ViewPlugin } from '@codemirror/view';

import { setHoveredHunkEffect } from './cm/effects.js';
import { diffField } from './cm/diff-field.js';

const PROXIMITY_LINES = 5;

export const diffHoverTracking = ViewPlugin.fromClass(
	class {
		hoveredHunkId: string | null = null;

		constructor(readonly view: EditorView) {}

		update() {
			this.hoveredHunkId =
				this.view.state.field(diffField, false)?.hoveredHunkId ?? null;
		}

		setHoveredHunkId(next: string | null) {
			if (this.hoveredHunkId === next) return;
			this.hoveredHunkId = next;
			this.view.dispatch({ effects: setHoveredHunkEffect.of(next) });
		}

		syncHoveredHunkFromY(clientY: number) {
			const threshold = this.view.defaultLineHeight * PROXIMITY_LINES;
			this.setHoveredHunkId(findNearestHunk(this.view, clientY, threshold));
		}
	},
	{
		eventHandlers: {
			mousemove(event) {
				this.syncHoveredHunkFromY(event.clientY);
			},
			mouseenter(event) {
				this.syncHoveredHunkFromY(event.clientY);
			},
			mouseleave() {
				this.setHoveredHunkId(null);
			},
		},
	},
);

function findNearestHunk(
	view: EditorView,
	clientY: number,
	threshold: number,
): string | null {
	let bestId: string | null = null;
	let bestDistance = Infinity;

	for (const element of view.dom.querySelectorAll<HTMLElement>(
		'[data-diff-hunk-id]',
	)) {
		const hunkId = element.dataset.diffHunkId;
		if (!hunkId) continue;
		const rect = element.getBoundingClientRect();
		if (rect.height === 0) continue;
		const distance = verticalDistance(clientY, rect.top, rect.bottom);
		if (distance < bestDistance) {
			bestDistance = distance;
			bestId = hunkId;
		}
	}

	return bestDistance <= threshold ? bestId : null;
}

function verticalDistance(y: number, top: number, bottom: number): number {
	if (y < top) return top - y;
	if (y > bottom) return y - bottom;
	return 0;
}
