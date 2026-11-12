import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { MarkdownFileInfo } from 'obsidian';
import type { DirectiveDefinition } from '../../../shared/directives/types.js';
import { parseDirectives } from '../../../shared/directives/syntax/parse.js';
import { diffField } from '../../../shared/diff/cm/diff-field.js';
import type { QuickEditState } from '../types.js';
import { quickEditChange } from './change.js';
import { draftEnd } from './draft/end.js';
import { editMetadataBaseline } from './baseline.js';
import { setQuickEditComposer } from './state.js';
import { promptCursor } from './draft/cursor.js';

type Options = {
	view: EditorView;
	info: MarkdownFileInfo;
	definition: DirectiveDefinition<QuickEditState>;
	preset?: string;
	isClosed: () => boolean;
};

export async function insertQuickEditPrompt({
	view,
	info,
	definition,
	preset,
	isClosed,
}: Options): Promise<void> {
	const file = info.file;
	if (!file) throw new Error('The originating note closed');
	const snapshot = view.state.doc;
	const captured = view.state.selection.main;
	// A preset inserts its own request; selected note text remains agent context.
	const selection =
		preset === undefined ? captured : EditorSelection.cursor(captured.head);
	const selected = snapshot.sliceString(selection.from, selection.to);
	const prompt = preset ?? selected;
	const baseline = view.state.field(diffField, false)?.oldContent;
	// Keep the selection's review baseline so cancelling edited query text
	// cannot silently accept an agent change that was already in the note.
	const selectionBaseline =
		baseline == null
			? undefined
			: selection.empty
				? ''
				: editMetadataBaseline(snapshot.toString(), baseline, [
						{ from: 0, to: selection.from, text: '' },
						{ from: selection.to, to: snapshot.length, text: '' },
					]);
	const instance = await definition.create({
		path: file.path,
		line: snapshot.lineAt(selection.from).number - 1,
		selection:
			preset === undefined
				? ''
				: captured.empty
					? snapshot.lineAt(captured.head).text
					: snapshot.sliceString(captured.from, captured.to),
		...(selectionBaseline === undefined ? {} : { selectionBaseline }),
		prompt,
		status: 'ready',
		error: '',
	});
	if (isClosed() || info.file !== file || !view.state.doc.eq(snapshot))
		throw new Error(
			'The note changed while quick edit was opening. Invoke the command again.',
		);
	const end = draftEnd(instance.id);
	const source =
		snapshot.sliceString(0, selection.from) +
		instance.text +
		prompt +
		end +
		snapshot.sliceString(selection.to);
	if (
		!parseDirectives(source).some(
			(token) => token.id === instance.id && token.from === selection.from,
		)
	)
		throw new Error(
			'Quick edit cannot start inside code, frontmatter, or another literal Markdown region',
		);
	view.dispatch(
		quickEditChange(
			view.state,
			// Wrap with insertions so existing file-review differences in the
			// selected passage survive while it becomes the native query.
			selection.empty
				? [
						{
							from: selection.from,
							to: selection.from,
							text: instance.text + prompt + end,
						},
					]
				: [
						{
							from: selection.from,
							to: selection.from,
							text: instance.text,
						},
						{ from: selection.to, to: selection.to, text: end },
					],
			[
				setQuickEditComposer.of({
					id: instance.id,
					fresh: true,
					pending: false,
					original: {
						anchor: selection.anchor,
						head: selection.head,
						text: selected,
						baseline: selectionBaseline,
					},
				}),
			],
			promptCursor(
				selection.from + instance.text.length,
				selection.from + instance.text.length + prompt.length,
			),
		),
	);
	view.focus();
}
