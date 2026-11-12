// @vitest-environment jsdom
import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import { redo, undo } from '@codemirror/commands';
import { afterEach, expect, it, vi } from 'vitest';
import { createQuickEditScenario } from '../testing/scenario.js';

vi.mock('obsidian', async (original) => {
	const { StateField } = await import('@codemirror/state');
	return {
		...(await original<Record<string, unknown>>()),
		editorLivePreviewField: StateField.define({
			create: () => true,
			update: (value: boolean) => value,
		}),
	};
});

let h: Awaited<ReturnType<typeof createQuickEditScenario>> | undefined;
afterEach(async () => {
	await h?.dispose();
	h = undefined;
	vi.restoreAllMocks();
	Reflect.deleteProperty(Range.prototype, 'getClientRects');
	document.body.replaceChildren();
});

async function setup() {
	vi.spyOn(document, 'hasFocus').mockReturnValue(true);
	Object.defineProperty(Range.prototype, 'getClientRects', {
		configurable: true,
		value: () => [],
	});
	h = await createQuickEditScenario(
		'before after',
		undefined,
		EditorView.theme({
			'.cm-content, .cm-line': { caretColor: 'rgb(200, 200, 200)' },
		}),
	);
	// jsdom has no layout. Verify cursor lifecycle here; actual widget inset,
	// native-caret suppression and Vim compatibility also need a browser check.
	vi.spyOn(h.cm, 'coordsAtPos').mockImplementation((_position, side) => ({
		left: side === -1 ? 30 : 42,
		right: side === -1 ? 30 : 42,
		top: 5,
		bottom: 25,
	}));
	h.cm.dispatch({ selection: { anchor: 7 } });
	return h;
}

it('draws one caret at the empty prompt coordinates and restores the host caret after typing', async () => {
	const target = await setup();
	const hostCaret = document.createElement('div');
	hostCaret.className = 'cm-cursor-primary';
	target.cm.scrollDOM.append(hostCaret);
	await target.interaction.begin(target.editor, target.info);
	await vi.waitFor(() =>
		expect(
			target.cm.dom.querySelector('.franklin-quick-edit-caret'),
		).not.toBeNull(),
	);
	const caret = target.cm.dom.querySelector<HTMLElement>(
		'.franklin-quick-edit-caret',
	);
	expect(caret?.style.left).toBe('42px');
	expect(caret?.style.height).toBe('20px');
	expect(getComputedStyle(target.cm.contentDOM).caretColor).toBe(
		'rgba(0, 0, 0, 0)',
	);
	expect(getComputedStyle(hostCaret).visibility).toBe('hidden');
	target.type('request');
	await vi.waitFor(() =>
		expect(
			target.cm.dom.querySelector('.franklin-quick-edit-caret'),
		).toBeNull(),
	);
	expect(getComputedStyle(target.cm.contentDOM).caretColor).toBe(
		'rgb(200, 200, 200)',
	);
	expect(getComputedStyle(hostCaret).visibility).toBe('visible');
	expect(target.editor.getValue()).toContain(':::request<!--');
	expect(undo(target.cm)).toBe(true);
	await vi.waitFor(() =>
		expect(
			target.cm.dom.querySelector('.franklin-quick-edit-caret'),
		).not.toBeNull(),
	);
	expect(redo(target.cm)).toBe(true);
	await vi.waitFor(() =>
		expect(
			target.cm.dom.querySelector('.franklin-quick-edit-caret'),
		).toBeNull(),
	);
});

it('hands off the caret on navigation and blur, restores it on click or refocus, and removes it on cancellation', async () => {
	const target = await setup();
	await target.interaction.begin(target.editor, target.info);
	const caret = () => target.cm.dom.querySelector('.franklin-quick-edit-caret');
	await vi.waitFor(() => expect(caret()).not.toBeNull());
	target.cm.dispatch({ selection: { anchor: target.cm.state.doc.length } });
	await vi.waitFor(() => expect(caret()).toBeNull());
	expect(getComputedStyle(target.cm.contentDOM).caretColor).toBe(
		'rgb(200, 200, 200)',
	);
	target.cm.dom
		.querySelector('.franklin-quick-edit-prompt')
		?.dispatchEvent(
			new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
		);
	await vi.waitFor(() => expect(caret()).not.toBeNull());
	const outside = document.createElement('button');
	document.body.append(outside);
	outside.focus();
	await vi.waitFor(() => expect(caret()).toBeNull());
	expect(getComputedStyle(target.cm.contentDOM).caretColor).toBe(
		'rgb(200, 200, 200)',
	);
	target.cm.focus();
	await vi.waitFor(() => expect(caret()).not.toBeNull());
	target.interaction.cancel(target.cm);
	await vi.waitFor(() => expect(caret()).toBeNull());
	expect(target.editor.getValue()).toBe('before after');
});

it('uses the host caret when opening a selected nonempty request', async () => {
	const target = await setup();
	target.cm.dispatch({ selection: { anchor: 0, head: 6 } });
	await target.interaction.begin(target.editor, target.info);
	expect(target.cm.dom.querySelector('.franklin-quick-edit-caret')).toBeNull();
	expect(getComputedStyle(target.cm.contentDOM).caretColor).toBe(
		'rgb(200, 200, 200)',
	);
});

it('keeps the empty caret inside after deleting the last character with backward association', async () => {
	const target = await setup();
	await target.interaction.begin(target.editor, target.info);
	const position = target.cm.state.selection.main.head;
	target.type('x');
	// Native Backspace can leave negative association on the same transaction
	// that empties the query, so it is still associated with the preceding control.
	target.cm.dispatch({
		changes: { from: position, to: position + 1, insert: '' },
		selection: EditorSelection.create([EditorSelection.cursor(position, -1)]),
	});
	await vi.waitFor(() => {
		const caret = target.cm.dom.querySelector<HTMLElement>(
			'.franklin-quick-edit-caret',
		);
		expect(caret?.style.left).toBe('42px');
	});
});
