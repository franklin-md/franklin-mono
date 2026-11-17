import type { Editor, MarkdownFileInfo } from 'obsidian';
import { trackEditorAnchor } from '../../obsidian/editor/anchors.js';
import type { DirectiveWriteTarget } from './types.js';

export function captureDirectiveTarget(
	editor: Editor,
	info: MarkdownFileInfo,
	line: number,
): DirectiveWriteTarget {
	const file = info.file;
	if (!file) throw new Error('Directive editor is not ready');
	const anchor = trackEditorAnchor(editor, { line });
	return {
		editor,
		resolve: () => {
			const offset = anchor.position();
			if (info.file !== file || offset === undefined)
				throw new Error(
					'The source line changed or its editor closed; the directive was not inserted',
				);
			return { path: file.path, from: editor.offsetToPos(offset) };
		},
		dispose: anchor.dispose,
	};
}
