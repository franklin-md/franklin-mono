import type { App, MarkdownView, View } from 'obsidian';
import type { QuestionSource, SourcePosition } from '../types.js';
import { captureSelection } from './capture.js';
import { createQuestionSource } from './source.js';

export async function captureCurrentNote(
	app: App,
	question: string,
): Promise<QuestionSource | undefined> {
	const { workspace } = app;
	// getActiveFile retains the last note when focus moves into a sidebar view.
	// https://docs.obsidian.md/Reference/TypeScript+API/Workspace/getActiveFile
	const file = workspace.getActiveFile();
	if (!file || file.extension !== 'md') return undefined;
	const recent = workspace.getMostRecentLeaf()?.view;
	const view = isNoteView(recent, file.path)
		? recent
		: workspace
				.getLeavesOfType('markdown')
				.map((leaf) => leaf.view)
				.find((view): view is MarkdownView => isNoteView(view, file.path));
	const content = view
		? view.editor.getValue()
		: await app.vault.cachedRead(file);
	const text = question.trim();
	const found = text ? content.indexOf(text) : -1;
	// A pasted task can be located precisely when its text occurs only once.
	// Ambiguous matches fall back to the note's actual selection/cursor.
	if (found >= 0 && content.indexOf(text, found + 1) < 0) {
		return createQuestionSource({
			content,
			file,
			quote: text,
			from: positionAt(content, found),
			to: positionAt(content, found + text.length),
		});
	}
	if (view) {
		const selection = captureSelection({ editor: view.editor, view });
		if (selection) return selection;
	}
	const line = view?.editor.getCursor().line ?? 0;
	const quote = content.split('\n')[line] ?? '';
	return createQuestionSource({
		content,
		file,
		quote,
		from: { line, ch: 0 },
		to: { line, ch: quote.length },
	});
}

function positionAt(content: string, offset: number): SourcePosition {
	const lines = content.slice(0, offset).split('\n');
	return { line: lines.length - 1, ch: lines.at(-1)?.length ?? 0 };
}

function isNoteView(
	view: View | undefined,
	path: string,
): view is MarkdownView {
	return (
		view?.getViewType() === 'markdown' &&
		(view as MarkdownView).file?.path === path
	);
}
