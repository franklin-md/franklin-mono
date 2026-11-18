import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { Editor, MarkdownFileInfo, TFile } from 'obsidian';
import { createTestBuffer } from './buffer.js';
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
	const editor = {
		cm,
		...createTestBuffer(
			() => cm.state,
			(transaction) => cm.dispatch(transaction),
		),
	} as unknown as Editor;
	const info = { file, editor } as MarkdownFileInfo;
	return { editor, cm, info, destroy: () => cm.destroy() };
}
