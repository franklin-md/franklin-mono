import { EditorState } from '@codemirror/state';
import type { App, Editor, TFile } from 'obsidian';
import { vi } from 'vitest';
import { createTestBuffer } from '../../editor/testing/buffer.js';

export function createMarkdownTestApp(notes: Record<string, string>) {
	const disk = new Map(Object.entries(notes));
	const editors = new Map<string, Editor>();
	const files = [...disk.keys()].map((path) => {
		// Structural host fixture; no Obsidian filesystem is involved.
		// eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
		return { path, extension: path.split('.').at(-1) } as TFile;
	});
	function read(path: string): string {
		const source = disk.get(path);
		if (source === undefined) throw new Error(`Missing test note: ${path}`);
		return source;
	}
	const app = {
		workspace: {
			iterateAllLeaves: (visit: (leaf: unknown) => void) => {
				for (const [path, editor] of editors)
					visit({
						view: {
							getViewType: () => 'markdown',
							getMode: () => 'source',
							file: files.find((file) => file.path === path),
							editor,
						},
					});
			},
		},
		vault: {
			getMarkdownFiles: () => files.filter((file) => file.extension === 'md'),
			getFileByPath: (path: string) =>
				files.find((file) => file.path === path) ?? null,
			read: vi.fn((file: TFile) => Promise.resolve(read(file.path))),
			process: vi.fn(async (file: TFile, plan: (source: string) => string) => {
				const next = plan(read(file.path));
				disk.set(file.path, next);
				return next;
			}),
		},
	} as unknown as App;

	function open(path: string, source = read(path)) {
		let state = EditorState.create({ doc: source });
		const editor = createTestBuffer(
			() => state,
			(transaction) => {
				state = state.update(transaction).state;
			},
		) as unknown as Editor;
		editors.set(path, editor);
		return editor;
	}

	return { app, disk, open };
}
