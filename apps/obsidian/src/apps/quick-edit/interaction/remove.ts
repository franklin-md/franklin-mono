import type { DirectiveInstance } from '../../../shared/directives/instance.js';
import type { DiffClient } from '../../../shared/diff/client.js';
import { editMarkdown } from '../../../shared/obsidian/markdown/edit.js';
import { findMarkdownEditor } from '../../../shared/obsidian/markdown/editor.js';
import { diffField } from '../../../shared/diff/cm/diff-field.js';
import type { QuickEditState } from '../types.js';
import { quickEditView } from './editor.js';
import { quickEditChange } from './change.js';
import { editMetadataBaseline } from './baseline.js';
import { quickEditCleanup } from './cleanup.js';
import { setQuickEditComposer } from './state.js';

export async function removeQuickEdit(
	instance: DirectiveInstance<QuickEditState>,
	diff: DiffClient,
): Promise<void> {
	const { app } = instance.registry;
	const { path, status } = instance.state.get();
	if (status === 'running')
		throw new Error('Stop the quick edit before removing its control');
	const plan = (source: string) => quickEditCleanup(source, instance);
	// Relocation makes text-diff range mapping ambiguous. Find this same control
	// in each version independently so cleanup cannot erase baseline prose or
	// leave the old control behind for Reject to resurrect.
	const cleanBaseline = (baseline: string) =>
		editMetadataBaseline(baseline, baseline, plan(baseline));
	const editor = findMarkdownEditor(app, path);
	const view = editor && quickEditView(editor);
	if (view) {
		const baseline = view.state.field(diffField, false)?.oldContent;
		view.dispatch(
			quickEditChange(
				view.state,
				plan(view.state.doc.toString()),
				[setQuickEditComposer.of(null)],
				undefined,
				baseline == null ? undefined : cleanBaseline(baseline),
			),
		);
		return;
	}
	const entry = await diff.getEntry(path);
	let baseline: string | undefined;
	await editMarkdown(app, path, (source) => {
		const edits = plan(source);
		if (entry) baseline = cleanBaseline(entry.oldContent);
		return edits;
	});
	if (baseline !== undefined) await diff.setBaseline(path, baseline);
}
