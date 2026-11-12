import { EditorState } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import { parseDirectives } from '../../../shared/directives/syntax/parse.js';
import { diffField } from '../../../shared/diff/cm/diff-field.js';
import { setBaselineEffect } from '../../../shared/diff/cm/effects.js';
import { editMetadataBaseline } from './baseline.js';
import { findQuickEditDraft } from './draft/find.js';
import { quickEditComposer, quickEditControl } from './state.js';
import { filterQuickEditTransaction } from './filter.js';
import { quickEditDeletion } from './delete.js';
import { EmptyPrompt } from './empty-prompt.js';
import { quickEditCaret } from './caret.js';
import type { DirectiveDefinition } from '../../../shared/directives/types.js';
import type { QuickEditState } from '../types.js';

type Options = {
	definition: DirectiveDefinition<QuickEditState>;
	composerChanged: (view: EditorView, id: string | null) => void;
	submit: (view: EditorView) => void;
	cancel: (view: EditorView) => void;
};

export function quickEditExtension(options: Options) {
	function build(view: EditorView): {
		decorations: DecorationSet;
		atomic: DecorationSet;
	} {
		if (!view.state.field(editorLivePreviewField, false))
			return { decorations: Decoration.none, atomic: Decoration.none };
		const source = view.state.doc.toString();
		const tokens = parseDirectives(source);
		const composer = view.state.field(quickEditComposer);
		const hidden = tokens
			.filter((token) => token.name === 'quick-edit')
			.flatMap((token) => {
				const draft = findQuickEditDraft(source, token.id, tokens);
				return draft
					? [
							Decoration.replace({
								widget:
									composer?.id === token.id &&
									draft.promptFrom === draft.promptTo
										? new EmptyPrompt()
										: undefined,
							}).range(draft.promptTo, draft.to),
						]
					: [];
			});
		const decorations = [...hidden];
		const draft = composer && findQuickEditDraft(source, composer.id, tokens);
		if (draft) {
			if (draft.promptFrom < draft.promptTo)
				decorations.push(
					Decoration.mark({ class: 'franklin-quick-edit-prompt' }).range(
						draft.promptFrom,
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
		return view.state.selection.ranges.length === 1 &&
			draft &&
			selection.from >= draft.promptFrom &&
			selection.to <= draft.promptTo
			? draft
			: undefined;
	};
	function handleKey(view: EditorView, event: KeyboardEvent): void {
		if (
			event.defaultPrevented ||
			event.isComposing ||
			view.composing ||
			event.ctrlKey ||
			event.metaKey ||
			event.altKey ||
			!event.composedPath().includes(view.contentDOM) ||
			!view.state.field(editorLivePreviewField, false)
		)
			return;
		if (event.key === 'Backspace' || event.key === 'Delete') {
			const change = quickEditDeletion(
				view.state,
				event.key,
				options.definition,
			);
			if (change) {
				event.preventDefault();
				event.stopPropagation();
				view.dispatch(change);
			}
			return;
		}
		if (!focused(view)) return;
		if (event.key !== 'Enter' && (event.key !== 'Escape' || event.shiftKey))
			return;
		// Outliner registers Enter at the same highest keymap precedence. Capture
		// the prompt's keys before CM's bubbling keymaps, regardless of load order.
		// https://codemirror.net/docs/ref/#view.keymap
		event.preventDefault();
		event.stopPropagation();
		if (event.key === 'Escape') options.cancel(view);
		else if (event.shiftKey) {
			const { from, to } = view.state.selection.main;
			view.dispatch({
				changes: { from, to, insert: '\n' },
				selection: { anchor: from + 1 },
				userEvent: 'input',
			});
		} else options.submit(view);
	}
	const composerId = (view: EditorView) =>
		view.state.field(editorLivePreviewField, false)
			? (view.state.field(quickEditComposer)?.id ?? null)
			: null;
	return [
		quickEditComposer,
		quickEditCaret,
		ViewPlugin.fromClass(
			class {
				decorations: DecorationSet;
				atomic: DecorationSet;
				private readonly keydown;
				constructor(private readonly view: EditorView) {
					this.keydown = (event: KeyboardEvent) => handleKey(view, event);
					view.dom.addEventListener('keydown', this.keydown, true);
					options.composerChanged(view, composerId(view));
					const built = build(view);
					this.decorations = built.decorations;
					this.atomic = built.atomic;
				}
				update(update: ViewUpdate) {
					if (
						update.startState.field(quickEditComposer)?.id !==
							update.state.field(quickEditComposer)?.id ||
						update.startState.field(editorLivePreviewField, false) !==
							update.state.field(editorLivePreviewField, false)
					)
						options.composerChanged(update.view, composerId(update.view));
					if (
						update.docChanged ||
						update.startState.field(quickEditComposer) !==
							update.state.field(quickEditComposer) ||
						update.startState.field(editorLivePreviewField, false) !==
							update.state.field(editorLivePreviewField, false)
					)
						Object.assign(this, build(update.view));
				}
				destroy() {
					this.view.dom.removeEventListener('keydown', this.keydown, true);
					options.composerChanged(this.view, null);
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
		EditorState.transactionFilter.of((transaction) =>
			transaction.startState.field(editorLivePreviewField, false)
				? filterQuickEditTransaction(transaction, options.definition)
				: transaction,
		),
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
				backgroundColor:
					'color-mix(in srgb, var(--interactive-accent) 24%, var(--background-primary))',
				boxShadow:
					'inset 0 0 0 1px color-mix(in srgb, var(--interactive-accent) 55%, transparent)',
				borderRadius: '3px',
				// Inherit host text metrics. Vertical inline padding paints outside the
				// line box, so use horizontal padding and an inset outline at each wrap.
				// https://developer.mozilla.org/en-US/docs/Web/CSS/box-decoration-break
				padding: '0 0.4em',
				boxDecorationBreak: 'clone',
			},
		}),
	];
}
