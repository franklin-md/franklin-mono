import { EditorSelection } from '@codemirror/state';

export function promptCursor(from: number, to: number): EditorSelection {
	// At a mark/replacement boundary, association decides which visual side owns
	// the caret. Empty prompts use their placeholder; other prompts use their text.
	// https://codemirror.net/docs/ref/#state.EditorSelection^cursor
	return EditorSelection.create([
		EditorSelection.cursor(to, from === to ? 1 : -1),
	]);
}
