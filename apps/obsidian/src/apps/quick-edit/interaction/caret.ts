import {
	EditorView,
	getDrawSelectionConfig,
	layer,
	RectangleMarker,
} from '@codemirror/view';
import { editorLivePreviewField } from 'obsidian';
import { findQuickEditDraft } from './draft/find.js';
import { promptCursor } from './draft/cursor.js';
import { quickEditComposer } from './state.js';

function emptyPromptCursor(view: EditorView) {
	const { state } = view;
	const cursor = state.selection.main;
	const composer = state.field(quickEditComposer, false);
	if (
		!view.hasFocus ||
		!state.field(editorLivePreviewField, false) ||
		!composer ||
		state.selection.ranges.length !== 1 ||
		!cursor.empty
	)
		return null;
	const draft = findQuickEditDraft(state.doc.toString(), composer.id);
	// Native Backspace may leave backward association when the query becomes
	// empty. Measure the placeholder side without changing document selection.
	return draft &&
		draft.promptFrom === draft.promptTo &&
		cursor.head === draft.promptFrom
		? promptCursor(draft.promptFrom, draft.promptTo).main
		: null;
}

function setBlinkRate(dom: HTMLElement, view: EditorView) {
	dom.style.animationDuration = `${getDrawSelectionConfig(view.state).cursorBlinkRate}ms`;
}

// Vim insert mode uses the native DOM caret, which sits outside an uneditable
// replacement widget even when its document position and coordsAt are correct.
// Draw only the empty prompt's caret using CM's measurement/layer lifecycle;
// document selection still owns typing, composition and undo.
// https://discuss.codemirror.net/t/cursor-stays-after-placeholder-gives-impression-like-placeholder-is-the-text/8490/2
// https://codemirror.net/docs/ref/#view.layer
export const quickEditCaret = [
	layer({
		above: true,
		class: 'franklin-quick-edit-caret-layer',
		markers(view) {
			const cursor = emptyPromptCursor(view);
			return cursor
				? RectangleMarker.forRange(view, 'franklin-quick-edit-caret', cursor)
				: [];
		},
		mount: setBlinkRate,
		update(update, dom) {
			setBlinkRate(dom, update.view);
			return (
				update.docChanged ||
				update.selectionSet ||
				update.focusChanged ||
				update.startState.field(quickEditComposer, false) !==
					update.state.field(quickEditComposer, false) ||
				update.startState.field(editorLivePreviewField, false) !==
					update.state.field(editorLivePreviewField, false)
			);
		},
	}),
	EditorView.editorAttributes.of((view) =>
		emptyPromptCursor(view)
			? { class: 'franklin-quick-edit-empty-caret' }
			: null,
	),
	EditorView.baseTheme({
		'&.franklin-quick-edit-empty-caret .cm-content, &.franklin-quick-edit-empty-caret .cm-content *':
			{ caretColor: 'transparent !important' },
		'&.franklin-quick-edit-empty-caret .cm-cursor-primary': {
			visibility: 'hidden',
		},
		'.franklin-quick-edit-caret-layer': {
			pointerEvents: 'none',
		},
		'&.franklin-quick-edit-empty-caret .franklin-quick-edit-caret-layer': {
			animation: 'steps(1) cm-blink 1.2s infinite',
		},
		'.franklin-quick-edit-caret': {
			width: '0',
			// Centre the painted stroke, not only its zero-width left edge. This
			// also respects wider host cursor settings without shifting the input.
			transform: 'translateX(-50%)',
			borderLeft:
				'var(--cursor-width, 1px) solid var(--caret-color, currentColor)',
		},
	}),
];
