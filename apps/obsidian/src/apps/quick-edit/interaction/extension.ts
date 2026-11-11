import { EditorState, Prec } from '@codemirror/state';
import {
	Decoration,
	EditorView,
	ViewPlugin,
	WidgetType,
	keymap,
} from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import { parseDirectives } from '../../../shared/directives/syntax/parse.js';
import { diffField } from '../../../shared/diff/cm/diff-field.js';
import { setBaselineEffect } from '../../../shared/diff/cm/effects.js';
import { editMetadataBaseline } from './baseline.js';
import { findQuickEditDraft } from './draft.js';
import { quickEditComposer, quickEditControl } from './state.js';

type Options = {
	submit: (view: EditorView) => void;
	cancel: (view: EditorView) => void;
};

class PromptHint extends WidgetType {
	toDOM(view: EditorView): HTMLElement {
		const hint = view.dom.ownerDocument.createElement('span');
		hint.className = 'franklin-quick-edit-hint';
		hint.textContent =
			' Enter to run · Shift+Enter for newline · Esc to cancel';
		return hint;
	}
}

export function quickEditExtension(options: Options) {
	function build(view: EditorView): {
		decorations: DecorationSet;
		atomic: DecorationSet;
	} {
		if (!view.state.field(editorLivePreviewField, false))
			return { decorations: Decoration.none, atomic: Decoration.none };
		const source = view.state.doc.toString();
		const hidden = parseDirectives(source)
			.filter((token) => token.name === 'quick-edit')
			.flatMap((token) => {
				const draft = findQuickEditDraft(source, token.id);
				return draft
					? [Decoration.replace({}).range(draft.promptTo, draft.to)]
					: [];
			});
		const decorations = [...hidden];
		const composer = view.state.field(quickEditComposer);
		const draft = composer && findQuickEditDraft(source, composer.id);
		if (draft) {
			if (draft.promptFrom < draft.promptTo)
				decorations.push(
					Decoration.mark({ class: 'franklin-quick-edit-prompt' }).range(
						draft.promptFrom,
						draft.promptTo,
					),
				);
			decorations.push(
				Decoration.widget({ widget: new PromptHint(), side: 1 }).range(
					draft.promptTo,
				),
			);
		}
		return {
			decorations: Decoration.set(decorations, true),
			atomic: Decoration.set(hidden, true),
		};
	}
	const focused = (view: EditorView) => {
		if (!view.state.field(editorLivePreviewField, false)) return undefined;
		const composer = view.state.field(quickEditComposer);
		const draft =
			composer && findQuickEditDraft(view.state.doc.toString(), composer.id);
		const selection = view.state.selection.main;
		return draft &&
			selection.from >= draft.promptFrom &&
			selection.to <= draft.promptTo
			? draft
			: undefined;
	};
	return [
		quickEditComposer,
		ViewPlugin.fromClass(
			class {
				decorations: DecorationSet;
				atomic: DecorationSet;
				constructor(view: EditorView) {
					const built = build(view);
					this.decorations = built.decorations;
					this.atomic = built.atomic;
				}
				update(update: ViewUpdate) {
					if (
						update.docChanged ||
						update.transactions.some(
							(transaction) => transaction.effects.length,
						) ||
						update.startState.field(editorLivePreviewField, false) !==
							update.state.field(editorLivePreviewField, false)
					)
						Object.assign(this, build(update.view));
				}
			},
			{
				decorations: (plugin) => plugin.decorations,
				provide: (plugin) =>
					EditorView.atomicRanges.of(
						(view) => view.plugin(plugin)?.atomic ?? Decoration.none,
					),
			},
		),
		Prec.highest(
			keymap.of([
				{
					key: 'Enter',
					run: (view) => {
						if (!focused(view) || view.composing) return false;
						options.submit(view);
						return true;
					},
				},
				{
					key: 'Shift-Enter',
					run: (view) => {
						if (!focused(view) || view.composing) return false;
						const { from, to } = view.state.selection.main;
						view.dispatch({
							changes: { from, to, insert: '\n' },
							selection: { anchor: from + 1 },
							userEvent: 'input',
						});
						return true;
					},
				},
				{
					key: 'Escape',
					run: (view) => {
						if (!focused(view)) return false;
						options.cancel(view);
						return true;
					},
				},
			]),
		),
		EditorState.transactionFilter.of((transaction) => {
			if (!transaction.docChanged || transaction.annotation(quickEditControl))
				return transaction;
			const composer = transaction.startState.field(quickEditComposer);
			const draft =
				composer &&
				findQuickEditDraft(transaction.startState.doc.toString(), composer.id);
			if (!draft) return transaction;
			const blocked: boolean[] = [];
			transaction.changes.iterChangedRanges((from, to) => {
				if (composer.pending && from <= draft.to && to >= draft.from)
					blocked.push(true);
				const whole = from <= draft.from && to >= draft.to;
				if (
					!whole &&
					((from < draft.promptFrom && to > draft.from) ||
						(from < draft.to && to > draft.promptTo))
				)
					blocked.push(true);
			});
			return blocked.length ? [] : transaction;
		}),
		EditorState.transactionExtender.of((transaction) => {
			if (!transaction.docChanged || transaction.annotation(quickEditControl))
				return null;
			const composer = transaction.startState.field(quickEditComposer);
			const draft =
				composer &&
				findQuickEditDraft(transaction.startState.doc.toString(), composer.id);
			const baseline = transaction.startState.field(
				diffField,
				false,
			)?.oldContent;
			if (!draft || baseline == null) return null;
			const edits: { from: number; to: number; text: string }[] = [];
			transaction.changes.iterChanges(
				(from, to, _newFrom, _newTo, inserted) => {
					if (from >= draft.promptFrom && to <= draft.promptTo)
						edits.push({ from, to, text: inserted.toString() });
				},
			);
			return edits.length
				? {
						effects: setBaselineEffect.of({
							oldContent: editMetadataBaseline(
								transaction.startState.doc.toString(),
								baseline,
								edits,
							),
						}),
					}
				: null;
		}),
		EditorView.baseTheme({
			'.franklin-quick-edit-prompt': {
				backgroundColor: 'var(--background-modifier-hover)',
				boxShadow: '0 0 0 2px var(--background-modifier-hover)',
				borderRadius: '3px',
			},
			'.franklin-quick-edit-hint': {
				color: 'var(--text-muted)',
				fontSize: '0.75em',
				pointerEvents: 'none',
				userSelect: 'none',
			},
		}),
	];
}
