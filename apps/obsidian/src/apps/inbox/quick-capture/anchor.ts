import type { EditorView } from '@codemirror/view';
import type { Editor } from 'obsidian';
import type { DirectiveWriteTarget } from '../../../shared/directives/scribe/types.js';
import type { CaptureAnchor } from './types.js';

export function createCaptureAnchor(editor: Editor, target: DirectiveWriteTarget): CaptureAnchor {
	// The same host bridge is used by directive insertion and the diff integration.
	// @ts-expect-error Obsidian does not publish editor.cm in its public types.
	const cm = editor.cm as EditorView | undefined;
	if (!cm) throw new Error('Capture editor is not ready');
	const contextElement = cm.dom;
	let previous = contextElement.getBoundingClientRect();
	return { contextElement, getBoundingClientRect: () => {
		try {
			const position = target.resolve().from;
			const coords = cm.coordsAtPos(editor.posToOffset(position));
			const win = contextElement.ownerDocument.defaultView;
			if (coords && win) previous = new win.DOMRect(coords.left, coords.top, 1, coords.bottom - coords.top);
		} catch {
			// Keep the last rectangle while the host closes an invalidated capture.
		}
		return previous;
	} };
}
