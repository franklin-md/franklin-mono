import type { Editor } from 'obsidian';
import type { EditorView } from '@codemirror/view';

export function quickEditView(editor: Editor): EditorView | undefined {
	// Same CM6 bridge used by directives and file diff review.
	// @ts-expect-error Obsidian does not expose editor.cm in its public types.
	return editor.cm as EditorView | undefined;
}
