import type { App, Editor } from 'obsidian';
import { findMarkdownEditor } from './editor.js';
import { getMarkdownFile } from './file.js';
import { readMarkdown } from './read.js';
import { validateMarkdownEdits } from './changes.js';
import type { MarkdownEditPlan } from './types.js';

export async function editMarkdown(
	app: App,
	path: string,
	plan: MarkdownEditPlan,
): Promise<number> {
	const file = getMarkdownFile(app, path);
	const source = await readMarkdown(app, file.path);
	const editor = findMarkdownEditor(app, file.path);
	if (editor) return editBuffer(editor, plan);
	if (validateMarkdownEdits(source, plan(source)).length === 0) return 0;

	let count = 0;
	// Re-plan inside the read/modify/write transaction, never from saved offsets.
	// The planner must be synchronous and may run more than once.
	// https://docs.obsidian.md/Reference/TypeScript+API/Vault/process
	await app.vault.process(file, (current) => {
		const opened = findMarkdownEditor(app, file.path);
		if (opened) {
			count = editBuffer(opened, plan);
			return current;
		}
		const edits = validateMarkdownEdits(current, plan(current));
		count = edits.length;
		for (const { from, to, text } of edits.reverse())
			current = current.slice(0, from) + text + current.slice(to);
		return current;
	});
	return count;
}

function editBuffer(editor: Editor, plan: MarkdownEditPlan): number {
	const source = editor.getValue();
	const edits = validateMarkdownEdits(source, plan(source));
	if (edits.length > 0)
		editor.transaction(
			{
				changes: edits.map(({ from, to, text }) => ({
					from: editor.offsetToPos(from),
					to: editor.offsetToPos(to),
					text,
				})),
			},
			'franklin-markdown',
		);
	return edits.length;
}
