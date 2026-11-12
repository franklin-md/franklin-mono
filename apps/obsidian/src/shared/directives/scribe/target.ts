import type { EditorView } from '@codemirror/view';
import type { Editor, MarkdownFileInfo } from 'obsidian';
import { directiveAnchors } from './anchors.js';
import type { DirectiveWriteTarget } from './types.js';

export function captureDirectiveTarget(
	editor: Editor,
	info: MarkdownFileInfo,
	line: number,
): DirectiveWriteTarget {
	// Obsidian exposes its CM6 view here, as in the existing diff integration.
	// @ts-expect-error Obsidian does not publish editor.cm in its public types.
	const cm = editor.cm as EditorView | undefined;
	if (!cm || !cm.state.field(directiveAnchors.field, false) || !info.file)
		throw new Error('Directive editor is not ready');
	const isDestroyed = () => {
		// @ts-expect-error CM6 keeps its destruction flag private.
		return cm.destroyed;
	};
	const file = info.file;
	const id = crypto.randomUUID();
	const range = cm.state.doc.line(line + 1);
	cm.dispatch({
		effects: directiveAnchors.add.of({ id, from: range.from, to: range.to }),
	});
	let disposed = false;
	return {
		editor,
		resolve: () => {
			const anchor = cm.state.field(directiveAnchors.field, false)?.get(id);
			if (disposed || isDestroyed() || info.file !== file || !anchor)
				throw new Error(
					'The source line changed or its editor closed; the question is still in the inbox',
				);
			const current = cm.state.doc.lineAt(anchor.to);
			return {
				path: file.path,
				from: { line: current.number - 1, ch: current.length },
			};
		},
		dispose: () => {
			if (disposed) return;
			disposed = true;
			if (!isDestroyed() && cm.state.field(directiveAnchors.field, false))
				cm.dispatch({ effects: directiveAnchors.remove.of(id) });
		},
	};
}
