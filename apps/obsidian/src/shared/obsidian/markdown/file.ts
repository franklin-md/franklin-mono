import type { App, TFile } from 'obsidian';
import { normalizePath } from 'obsidian';

export function getMarkdownFile(app: App, path: string): TFile {
	const file = app.vault.getFileByPath(normalizePath(path));
	if (!file || file.extension !== 'md')
		throw new Error(`Markdown note not found: ${path}`);
	return file;
}
