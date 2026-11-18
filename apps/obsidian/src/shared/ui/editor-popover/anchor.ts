import type { Editor } from 'obsidian';
import { trackEditorAnchor } from '../../obsidian/editor/anchors.js';
import type { EditorPopoverAnchor } from './types.js';

export function createEditorAnchor(
	editor: Editor,
	validate: () => void,
): EditorPopoverAnchor & { dispose: () => void } {
	const anchor = trackEditorAnchor(editor, 'caret');
	const contextElement = anchor.view.dom;
	let previous = contextElement.getBoundingClientRect();
	return {
		contextElement,
		dispose: anchor.dispose,
		getBoundingClientRect: () => {
			try {
				validate();
				const position = anchor.position();
				const coords =
					position === undefined ? null : anchor.view.coordsAtPos(position);
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
