import { EditorSelection } from '@codemirror/state';
import type { EditorState, TransactionSpec } from '@codemirror/state';
import type { EditorPosition, EditorTransaction } from 'obsidian';
import { vi } from 'vitest';

export function createTestBuffer(
	state: () => EditorState,
	dispatch: (spec: TransactionSpec) => void,
) {
	const posToOffset = ({ line, ch }: EditorPosition) =>
		state().doc.line(line + 1).from + ch;
	const offsetToPos = (offset: number) => {
		const line = state().doc.lineAt(offset);
		return { line: line.number - 1, ch: offset - line.from };
	};
	return {
		posToOffset,
		offsetToPos,
		getValue: () => state().doc.toString(),
		getLine: (line: number) => state().doc.line(line + 1).text,
		getCursor: () => offsetToPos(state().selection.main.head),
		setSelection: (from: EditorPosition, to = from) =>
			dispatch({
				selection: { anchor: posToOffset(from), head: posToOffset(to) },
			}),
		transaction: vi.fn(({ changes, selections }: EditorTransaction) => {
			dispatch({
				changes: changes?.map(({ from, to, text }) => ({
					from: posToOffset(from),
					to: to && posToOffset(to),
					insert: text,
				})),
				selection:
					selections &&
					EditorSelection.create(
						selections.map(({ from, to = from }) =>
							EditorSelection.range(posToOffset(from), posToOffset(to)),
						),
					),
			});
		}),
	};
}
