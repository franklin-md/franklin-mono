import type { DirectiveInstance } from '../../../shared/directives/instance.js';
import type { DiffClient } from '../../../shared/diff/client.js';
import { editMarkdown } from '../../../shared/obsidian/markdown/edit.js';
import { findMarkdownEditor } from '../../../shared/obsidian/markdown/editor.js';
import { findDirectiveRanges } from '../../../shared/directives/scribe/find.js';
import type { QuickEditState } from '../types.js';
import { quickEditView } from './editor.js';
import { changeQuickEdit } from './change.js';
import { editMetadataBaseline } from './baseline.js';
import { findQuickEditDraft } from './draft.js';
import { setQuickEditComposer } from './state.js';

export async function dismissQuickEdit(
	instance: DirectiveInstance<QuickEditState>,
	diff: DiffClient,
): Promise<void> {
	const { app } = instance.registry;
	const { path, status } = instance.state.get();
	if (status === 'running')
		throw new Error('Stop the quick edit before dismissing it');
	const plan = (source: string) => {
		const matches = findDirectiveRanges(source, instance);
		if (matches.length !== 1)
			throw new Error('Expected exactly one quick edit in its original note');
		const token = matches[0];
		if (!token) throw new Error('Quick edit no longer exists');
		const draft = findQuickEditDraft(source, instance.id);
		return [{ from: token.from, to: draft?.to ?? token.to, text: '' }];
	};
	const editor = findMarkdownEditor(app, path);
	const view = editor && quickEditView(editor);
	if (view) {
		changeQuickEdit(view, plan(view.state.doc.toString()), [
			setQuickEditComposer.of(null),
		]);
		return;
	}
	const entry = await diff.getEntry(path);
	let baseline: string | undefined;
	await editMarkdown(app, path, (source) => {
		const edits = plan(source);
		if (entry) baseline = editMetadataBaseline(source, entry.oldContent, edits);
		return edits;
	});
	if (baseline !== undefined) await diff.setBaseline(path, baseline);
}
