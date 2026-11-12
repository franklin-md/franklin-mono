import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type {
	Editor,
	EditorPosition,
	EditorTransaction,
	MarkdownFileInfo,
	TFile,
} from 'obsidian';
import { directiveAnchors } from '../scribe/anchors.js';

export function createDirectiveTestEditor(content: string) {
	const cm = new EditorView({
		state: EditorState.create({
			doc: content,
			extensions: [directiveAnchors.field],
		}),
	});
	// Structural test file: no host filesystem is involved.
	// eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
	const file = { path: 'original.md', basename: 'original' } as TFile;
	const offset = (position: EditorPosition) =>
		cm.state.doc.line(position.line + 1).from + position.ch;
	const position = (offset: number) => {
		const line = cm.state.doc.lineAt(offset);
		return { line: line.number - 1, ch: offset - line.from };
	};
	const editor = {
		cm,
		getValue: () => cm.state.doc.toString(),
		getLine: (line: number) => cm.state.doc.line(line + 1).text,
		getSelection: () =>
			cm.state.sliceDoc(
				cm.state.selection.main.from,
				cm.state.selection.main.to,
			),
		getCursor: (which?: 'from' | 'to') =>
			position(
				which === 'from'
					? cm.state.selection.main.from
					: which === 'to'
						? cm.state.selection.main.to
						: cm.state.selection.main.head,
			),
		setSelection: (from: EditorPosition, to: EditorPosition = from) =>
			cm.dispatch({ selection: { anchor: offset(from), head: offset(to) } }),
		posToOffset: offset,
		offsetToPos: position,
		transaction: ({ changes, selections }: EditorTransaction) => {
			cm.dispatch({
				changes: changes?.map((change) => ({
					from: offset(change.from),
					to: change.to ? offset(change.to) : undefined,
					insert: change.text,
				})),
				selection: selections
					? EditorSelection.create(
							selections.map((selection) =>
								EditorSelection.range(
									offset(selection.from),
									selection.to ? offset(selection.to) : offset(selection.from),
								),
							),
						)
					: undefined,
			});
		},
	} as unknown as Editor;
	const info = { file, editor } as MarkdownFileInfo;
	return { editor, cm, info, destroy: () => cm.destroy() };
}
