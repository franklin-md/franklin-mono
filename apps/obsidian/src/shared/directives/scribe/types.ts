import type { Editor, EditorPosition } from 'obsidian';

export type DirectiveWriteTarget = {
	editor: Editor;
	resolve: () => { path: string; from: EditorPosition };
	dispose: () => void;
};

export type ReplacementFailure = { path: string; error: string };
export type DirectiveLocation = { path: string; from: number; to: number };
export type DirectiveSearchResult = {
	locations: DirectiveLocation[];
	failures: ReplacementFailure[];
};

export type ReplacementResult = {
	replacements: number;
	filesChanged: string[];
	failures: ReplacementFailure[];
};
