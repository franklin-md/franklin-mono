import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type {
	Editor,
	EditorPosition,
	EditorTransaction,
	MarkdownFileInfo,
	TFile,
} from 'obsidian';
import { editorAnchors } from '../anchors.js';

export function createTestEditor(content: string) {
	const cm = new EditorView({
		state: EditorState.create({
			doc: content,
			extensions: [editorAnchors],
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
		getCursor: () => position(cm.state.selection.main.head),
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
							selections.map(({ from, to = from }) =>
								EditorSelection.range(offset(from), offset(to)),
							),
						)
					: undefined,
			});
		},
	} as unknown as Editor;
	const info = { file, editor } as MarkdownFileInfo;
	return { editor, cm, info, destroy: () => cm.destroy() };
}
