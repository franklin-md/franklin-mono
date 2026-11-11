import type { App, MarkdownView } from 'obsidian';
import { Notice } from 'obsidian';
import type { QuestionSource } from '../types.js';
import { findSourcePassage } from './find-passage.js';

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
	const passage = findSourcePassage(editor.getValue(), source);
	if (!passage) {
		if (!source.quote.trim()) return;
		new Notice(
			'The source text has changed. Showing the note; the original quote is preserved in the inbox.',
		);
		return;
	}
	const from = editor.offsetToPos(passage.start);
	const to = editor.offsetToPos(passage.end);
	editor.setSelection(from, to);
	editor.scrollIntoView({ from, to }, true);
	editor.focus();
}
