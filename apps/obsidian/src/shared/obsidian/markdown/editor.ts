import type { App, Editor, MarkdownView } from 'obsidian';

export function findMarkdownEditor(app: App, path: string): Editor | undefined {
	let editor: Editor | undefined;
	app.workspace.iterateAllLeaves((leaf) => {
		if (editor || leaf.view.getViewType() !== 'markdown') return;
		const view = leaf.view as MarkdownView;
		if (view.file?.path === path && view.getMode() === 'source')
			editor = view.editor;
	});
	return editor;
}
