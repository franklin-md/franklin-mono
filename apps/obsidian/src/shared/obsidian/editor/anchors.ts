import { StateEffect, StateField } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { Editor } from 'obsidian';

type Anchor = { from: number; to: number; kind: 'caret' | 'line' };
const add = StateEffect.define<{ id: symbol; anchor: Anchor }>();
const remove = StateEffect.define<symbol>();

export const editorAnchors = StateField.define<ReadonlyMap<symbol, Anchor>>({
	create: () => new Map(),
	update(previous, { changes, effects, newDoc }) {
		if (!effects.length && (!previous.size || changes.empty)) return previous;
		const next = new Map(previous);
		if (previous.size && !changes.empty) {
			changes.iterChangedRanges((from, to) => {
				if (from === to) return;
				for (const [id, anchor] of next)
					if (from <= anchor.from && to >= anchor.to) next.delete(id);
			});
			for (const [id, anchor] of next) {
				if (anchor.kind === 'caret') {
					const head = changes.mapPos(anchor.to, 1);
					next.set(id, { kind: 'caret', from: head, to: head });
				} else {
					// At a line break inserted at the endpoint, stay with the original line.
					// Reading its full extent also tracks ordinary typing at the same position.
					const line = newDoc.lineAt(changes.mapPos(anchor.to, -1));
					next.set(id, { kind: 'line', from: line.from, to: line.to });
				}
			}
		}
		for (const effect of effects) {
			if (effect.is(add)) next.set(effect.value.id, effect.value.anchor);
			if (effect.is(remove)) next.delete(effect.value);
		}
		return next;
	},
});

export function trackEditorAnchor(
	editor: Editor,
	target: 'caret' | { line: number },
) {
	// @ts-expect-error Obsidian exposes its CM6 view on editor.cm at runtime.
	const view = editor.cm as EditorView | undefined;
	if (!view || !view.state.field(editorAnchors, false))
		throw new Error('Editor is not ready');
	const id = Symbol();
	const head = view.state.selection.main.head;
	const range =
		target === 'caret'
			? { from: head, to: head }
			: view.state.doc.line(target.line + 1);
	const anchor: Anchor = {
		from: range.from,
		to: range.to,
		kind: target === 'caret' ? 'caret' : 'line',
	};
	view.dispatch({ effects: add.of({ id, anchor }) });
	const position = () => {
		// @ts-expect-error CM6 keeps its destruction flag private.
		if (view.destroyed) return undefined;
		return view.state.field(editorAnchors, false)?.get(id)?.to;
	};
	return {
		view,
		position,
		dispose: () => {
			if (position() !== undefined) view.dispatch({ effects: remove.of(id) });
		},
	};
}
