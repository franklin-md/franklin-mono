import type { App, MarkdownView } from 'obsidian';
import { Notice } from 'obsidian';
import type { QuestionSource } from '../types.js';

export async function openQuestionSource(
	app: App,
	source: QuestionSource,
): Promise<void> {
	const path = source.location?.path;
	if (!path) return;
	const file = app.vault.getFileByPath(path);
	if (!file) {
		new Notice(
			`Source note is missing or renamed: ${path}. The captured quote is still in the inbox.`,
		);
		return;
	}
	const leaf = app.workspace.getLeaf(false);
	await leaf.openFile(file);
	if (leaf.view.getViewType() !== 'markdown') return;
	const editor = (leaf.view as MarkdownView).editor;
	const content = editor.getValue();
	const original = source.location
		? editor.posToOffset(source.location.from)
		: -1;
	let start =
		content.slice(original, original + source.quote.length) === source.quote
			? original
			: content.indexOf(source.quote);
	if (start < 0) {
		new Notice(
			'The source text has changed. Showing the note; the original quote is preserved in the inbox.',
		);
		return;
	}
	if (start !== original && content.indexOf(source.quote, start + 1) !== -1) {
		new Notice(
			'This quote appears more than once. Showing the note; use the captured heading to locate it.',
		);
		return;
	}
	start = Math.max(0, start);
	const from = editor.offsetToPos(start);
	const to = editor.offsetToPos(start + source.quote.length);
	editor.setSelection(from, to);
	editor.scrollIntoView({ from, to }, true);
	editor.focus();
}
