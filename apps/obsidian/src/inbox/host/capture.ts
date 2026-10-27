import type { Editor, MarkdownFileInfo } from 'obsidian';
import type { QuestionSource } from '../types.js';
import { createQuestionSource } from './source.js';

type Options = { editor: Editor; view: MarkdownFileInfo };

export function captureSelection({
	editor,
	view,
}: Options): QuestionSource | undefined {
	const quote = editor.getSelection();
	const file = view.file;
	if (!file || !quote.trim()) return undefined;
	return createQuestionSource({
		content: editor.getValue(),
		file,
		quote,
		from: editor.getCursor('from'),
		to: editor.getCursor('to'),
	});
}
