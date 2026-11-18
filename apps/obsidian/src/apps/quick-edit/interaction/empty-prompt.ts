import { WidgetType } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import { quickEditComposer } from './state.js';
import { findQuickEditDraft } from './draft/find.js';
import { promptCursor } from './draft/cursor.js';

export class EmptyPrompt extends WidgetType {
	toDOM(view: EditorView): HTMLElement {
		const surface = view.dom.ownerDocument.createElement('span');
		surface.className = 'franklin-quick-edit-prompt';
		surface.setAttribute('aria-hidden', 'true');
		surface.textContent = '\u200b';
		surface.addEventListener('mousedown', (event) => {
			if (
				event.button ||
				event.shiftKey ||
				event.ctrlKey ||
				event.metaKey ||
				event.altKey
			)
				return;
			const composer = view.state.field(quickEditComposer);
			const draft =
				composer && findQuickEditDraft(view.state.doc.toString(), composer.id);
			if (!draft || draft.promptFrom !== draft.promptTo) return;
			// The placeholder replaces the closing marker. Its entire visible
			// surface is the input, even where CM's hit test would choose after it.
			event.preventDefault();
			view.dispatch({
				selection: promptCursor(draft.promptFrom, draft.promptTo),
				userEvent: 'select.pointer',
			});
			view.focus();
		});
		return surface;
	}

	coordsAt(dom: HTMLElement, pos: number) {
		const box = dom.getBoundingClientRect();
		// Match surrounding text height so handing off to the host caret on
		// typing does not resize it. Only the horizontal position is special:
		// centred inside the empty input, at the box edge outside the marker.
		// https://codemirror.net/docs/ref/#view.WidgetType.coordsAt
		const x = pos === 0 ? (box.left + box.right) / 2 : box.right;
		return {
			left: x,
			right: x,
			top: box.top,
			bottom: box.bottom,
		};
	}
}
