import type { Editor, MarkdownFileInfo } from 'obsidian';
import type { QuestionSource } from '../types.js';
import { createQuestionSource } from './source.js';

type Options = { editor: Editor; view: MarkdownFileInfo };

export function captureSelection({
	editor,
	view,
}: Options): QuestionSource | undefined {
	const file = view.file;
	if (!file) return undefined;
	let quote = editor.getSelection();
	let from = editor.getCursor('from');
	let to = editor.getCursor('to');
	// Cursor placement and tiny selections should capture the row, including when
	// indentation or spaces make the selection longer than its meaningful text.
	if (quote.replace(/\s/g, '').length <= 3) {
		const line = editor.getCursor().line;
		quote = editor.getLine(line);
		from = { line, ch: 0 };
		to = { line, ch: quote.length };
	}
	if (!quote.trim()) return undefined;
	return createQuestionSource({
		content: editor.getValue(),
		file,
		quote,
		from,
		to,
	});
}
