import type { EditorView } from '@codemirror/view';
import type { Editor } from 'obsidian';
import { directiveAnchors } from '../../directives/scribe/anchors.js';
import type { FloatingAnchor } from '@franklin/ui';

export function createEditorAnchor(
	editor: Editor,
	validate: () => void,
): FloatingAnchor & { dispose: () => void } {
	// The same host bridge is used by directive insertion and the diff integration.
	// @ts-expect-error Obsidian does not publish editor.cm in its public types.
	const cm = editor.cm as EditorView | undefined;
	if (!cm) throw new Error('Editor is not ready');
	const contextElement = cm.dom;
	const id = crypto.randomUUID();
	const position = cm.state.selection.main.head;
	// Follow the invocation caret independently of where an action later writes.
	// Reuse the existing transaction mapping for editor-owned markers.
	// https://codemirror.net/docs/ref/#state.ChangeDesc.mapPos
	cm.dispatch({
		effects: directiveAnchors.add.of({ id, from: position, to: position }),
	});
	let previous = contextElement.getBoundingClientRect();
	return {
		contextElement,
		dispose: () => {
			// @ts-expect-error CM6 keeps its destruction flag private, as in the scribe target.
			if (!cm.destroyed && cm.state.field(directiveAnchors.field, false))
				cm.dispatch({ effects: directiveAnchors.remove.of(id) });
		},
		getBoundingClientRect: () => {
			try {
				validate();
				const position = cm.state
					.field(directiveAnchors.field, false)
					?.get(id)?.from;
				const coords = position === undefined ? null : cm.coordsAtPos(position);
				const win = contextElement.ownerDocument.defaultView;
				if (coords && win)
					previous = new win.DOMRect(
						coords.left,
						coords.top,
						1,
						coords.bottom - coords.top,
					);
			} catch {
				// Keep the last rectangle while the host closes an invalidated capture.
			}
			return previous;
		},
	};
}
