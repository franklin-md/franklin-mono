import type { App } from 'obsidian';
import { findMarkdownEditor } from './editor.js';
import { getMarkdownFile } from './file.js';

export async function readMarkdown(app: App, path: string): Promise<string> {
	const file = getMarkdownFile(app, path);
	const editor = findMarkdownEditor(app, file.path);
	if (editor) return editor.getValue();
	const source = await app.vault.read(file);
	// Reading yielded; a newly opened buffer may contain unsaved edits.
	return findMarkdownEditor(app, file.path)?.getValue() ?? source;
}
