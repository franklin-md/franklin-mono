// @vitest-environment jsdom
import type { EditorView } from '@codemirror/view';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { setDiffEffect } from '../../../../shared/diff/cm/effects.js';
import { diffField } from '../../../../shared/diff/cm/diff-field.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQuickEditScenario } from '../testing/scenario.js';
import { findQuickEditDraft } from '../draft/find.js';
import { quickEditComposer, setQuickEditComposer } from '../state.js';

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

function press(view: EditorView, key: string, options: KeyboardEventInit = {}) {
	const event = new KeyboardEvent('keydown', {
		key,
		bubbles: true,
		cancelable: true,
		...options,
	});
	view.contentDOM.dispatchEvent(event);
	return event.defaultPrevented;
}

let h: Awaited<ReturnType<typeof createQuickEditScenario>> | undefined;
afterEach(async () => {
	await h?.dispose();
	h = undefined;
	document.body.replaceChildren();
});

describe('native quick edit interaction', () => {
	it.each(['', 'request', 'first line\nsecond line'])(
		'keeps the highlight inside native text metrics and removes it on Escape: %j',
		async (prompt) => {
			h = await createQuickEditScenario('before after');
			h.cm.contentDOM.style.lineHeight = '24px';
			h.cm.dispatch({ selection: { anchor: 7 } });
			await h.interaction.begin(h.editor, h.info);
			if (prompt) h.type(prompt);
			const highlights = h.cm.dom.querySelectorAll(
				'.franklin-quick-edit-prompt',
			);
			expect(highlights.length).toBeGreaterThan(0);
			for (const highlight of highlights) {
				const style = getComputedStyle(highlight);
				expect(style.lineHeight).toBe(
					getComputedStyle(h.cm.contentDOM).lineHeight,
				);
				expect(style.paddingTop).toBe('0px');
				expect(style.paddingBottom).toBe('0px');
				expect(style.boxShadow).toContain('inset');
			}
			expect(press(h.cm, 'Escape')).toBe(true);
			expect(h.cm.dom.querySelector('.franklin-quick-edit-prompt')).toBeNull();
			expect(h.editor.getValue()).toBe('before after');
		},
	);
	it.each([
		{ anchor: 7, head: 12 },
		{ anchor: 12, head: 7 },
		{ anchor: 9, head: 9 },
	])(
		'runs a preset with captured context without consuming note text: $anchor to $head',
		async ({ anchor, head }) => {
			const source = 'before words after';
			h = await createQuickEditScenario(source);
			h.cm.dispatch({
				selection: { anchor, head },
				effects: setDiffEffect.of({ oldContent: 'before old words after' }),
			});
			await h.interaction.runPreset(h.editor, h.info, 'Add an example.');
			expect(h.run).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					state: expect.objectContaining({
						prompt: 'Add an example.',
						selection: anchor === head ? source : 'words',
					}),
				}),
			);
			expect(h.disk).toBe(source);
			expect(h.editor.getValue()).toBe(source);
			expect(h.cm.state.field(diffField).oldContent).toBe(
				'before old words after',
			);
		},
	);
	it('refuses to replace or submit an existing draft with a preset', async () => {
		h = await createQuickEditScenario('note');
		await h.interaction.begin(h.editor, h.info);
		h.type('unfinished request');
		await expect(
			h.interaction.runPreset(h.editor, h.info, 'Condense.'),
		).rejects.toThrow('current quick edit');
		expect(h.run).not.toHaveBeenCalled();
		expect(h.editor.getValue()).toContain('unfinished request');
	});
	it('successful execution removes the directive without accepting the agent difference', async () => {
		h = await createQuickEditScenario('new words');
		h.cm.dispatch({
			effects: setDiffEffect.of({ oldContent: 'old words' }),
			selection: { anchor: 4 },
		});
		await h.interaction.begin(h.editor, h.info);
		h.type('request');
		h.interaction.submit(h.cm);
		await vi.waitFor(() =>
			expect(h?.definition.instances()[0]?.state.get().status).toBe('done'),
		);
		expect(h.editor.getValue()).toBe('new words');
		expect(h.cm.state.field(diffField).oldContent).toBe('old words');
		expect(h.cm.state.field(diffField).hunks).toHaveLength(1);
	});
	it.each(['- parent\n  - child suffix', '1. item suffix', 'plain suffix'])(
		'owns DOM Enter before an earlier outline binding in %s',
		async (source) => {
			const outlineEnter = vi.fn((view: EditorView) => {
				view.dispatch(view.state.replaceSelection('\n- '));
				return true;
			});
			h = await createQuickEditScenario(
				source,
				undefined,
				Prec.highest(keymap.of([{ key: 'Enter', run: outlineEnter }])),
			);
			h.cm.dispatch({ selection: { anchor: source.indexOf(' suffix') } });
			await h.interaction.begin(h.editor, h.info);
			h.type('add detail');
			const event = new KeyboardEvent('keydown', {
				key: 'Enter',
				bubbles: true,
				cancelable: true,
			});
			h.cm.contentDOM.dispatchEvent(event);
			await vi.waitFor(() => expect(h?.run).toHaveBeenCalledOnce());
			expect(event.defaultPrevented).toBe(true);
			expect(outlineEnter).not.toHaveBeenCalled();
			expect(h.editor.getValue().split('\n')).toHaveLength(
				source.split('\n').length,
			);
			expect(h.editor.getValue()).toMatch(/ suffix$/);
		},
	);
	it.each([
		{ source: 'before add detail after', anchor: 7, head: 17 },
		{ source: 'before add detail after', anchor: 17, head: 7 },
		{
			source: '- parent\n  - add one\n    add two suffix',
			anchor: 13,
			head: 32,
		},
	])(
		'wraps the selected request in place and restores it on Escape: $anchor to $head',
		async ({ source, anchor, head }) => {
			h = await createQuickEditScenario(source);
			h.cm.dispatch({ selection: { anchor, head } });
			await h.interaction.begin(h.editor, h.info);
			const instance = h.definition.instances()[0];
			if (!instance) throw new Error('Expected request');
			const draft = findQuickEditDraft(h.editor.getValue(), instance.id);
			if (!draft) throw new Error('Expected draft');
			const selected = source.slice(
				Math.min(anchor, head),
				Math.max(anchor, head),
			);
			expect(h.cm.state.sliceDoc(draft.promptFrom, draft.promptTo)).toBe(
				selected,
			);
			expect(h.editor.getValue().slice(0, draft.from)).toBe(
				source.slice(0, Math.min(anchor, head)),
			);
			expect(h.editor.getValue().slice(draft.to)).toBe(
				source.slice(Math.max(anchor, head)),
			);
			expect(h.cm.state.selection.main.head).toBe(draft.promptTo);
			h.type(' amended');
			expect(press(h.cm, 'Escape')).toBe(true);
			expect(h.editor.getValue()).toBe(source);
			expect(h.cm.state.selection.main).toMatchObject({ anchor, head });
			expect(h.run).not.toHaveBeenCalled();
		},
	);

	it('submits selected text as the query without keeping a copy in the note', async () => {
		h = await createQuickEditScenario('before add detail after');
		h.cm.dispatch({ selection: { anchor: 7, head: 17 } });
		await h.interaction.begin(h.editor, h.info);
		expect(press(h.cm, 'Enter')).toBe(true);
		await vi.waitFor(() => expect(h?.run).toHaveBeenCalledOnce());
		expect(h.run).toHaveBeenCalledWith(
			expect.objectContaining({
				state: expect.objectContaining({ prompt: 'add detail', selection: '' }),
			}),
		);
		expect(h.disk).not.toContain('add detail');
		expect(h.disk).toBe('before  after');
	});

	it('cancels without deleting the selected passage or existing suffix', async () => {
		h = await createQuickEditScenario('alpha beta');
		h.cm.dispatch({ selection: { anchor: 0, head: 5 } });
		await h.interaction.begin(h.editor, h.info);
		h.type('add more');
		expect(h.editor.getValue()).toMatch(/^:::franklin:quick-edit:/);
		expect(h.editor.getValue()).toMatch(/ beta$/);
		expect(press(h.cm, 'Escape')).toBe(true);
		expect(h.editor.getValue()).toBe('alpha beta');
		expect(h.cm.state.selection.main).toMatchObject({ anchor: 0, head: 5 });
		expect(h.run).not.toHaveBeenCalled();
	});

	it('runs Enter, supports multiline requests and saves the note before execution', async () => {
		h = await createQuickEditScenario('before after');
		h.cm.dispatch({ selection: { anchor: 6 } });
		await h.interaction.begin(h.editor, h.info);
		h.type('add below');
		expect(press(h.cm, 'Enter', { shiftKey: true })).toBe(true);
		h.type('keep the outline');
		expect(press(h.cm, 'Enter')).toBe(true);
		await vi.waitFor(() =>
			expect(h?.definition.instances()[0]?.state.get().status).toBe('done'),
		);
		expect(h.run).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				state: expect.objectContaining({
					prompt: 'add below\nkeep the outline',
				}),
			}),
		);
		expect(h.save).toHaveBeenCalledTimes(2);
		expect(h.disk).not.toContain('add below');
		expect(h.disk).not.toContain('quick-edit-end');
		expect(h.disk).toMatch(/ after$/);
		expect(h.cm.state.field(quickEditComposer)).toBeNull();
	});

	it('focuses an existing composer instead of creating another directive', async () => {
		h = await createQuickEditScenario('note');
		await h.interaction.begin(h.editor, h.info);
		h.type('request');
		await h.interaction.begin(h.editor, h.info);
		expect(h.definition.instances()).toHaveLength(1);
		expect(h.editor.getValue().match(/:::franklin:quick-edit:/g)).toHaveLength(
			1,
		);
	});

	it('reopens a failed prompt and Escape preserves its status and original selection', async () => {
		h = await createQuickEditScenario('before after', async () => {
			throw new Error('Retry me');
		});
		await h.interaction.begin(h.editor, h.info);
		h.type('fix');
		h.interaction.submit(h.cm);
		await vi.waitFor(() =>
			expect(h?.definition.instances()[0]?.state.get().status).toBe('failed'),
		);
		const completed = h.editor.getValue();
		h.cm.dispatch({ selection: { anchor: completed.length } });
		const instance = h.definition.instances()[0];
		if (!instance) throw new Error('Expected request');
		await h.interaction.open(instance.id);
		expect(h.interaction.composing.get()).toBe(instance.id);
		h.type(' amended');
		expect(press(h.cm, 'Escape')).toBe(true);
		expect(h.interaction.composing.get()).toBeNull();
		expect(h.editor.getValue()).toBe(completed);
		expect(h.cm.state.selection.main.head).toBe(completed.length);
		expect(instance.state.get()).toMatchObject({
			status: 'failed',
			prompt: 'fix',
		});
	});

	it('keeps native query text when saving the request fails', async () => {
		h = await createQuickEditScenario('note');
		await h.interaction.begin(h.editor, h.info);
		h.type('keep me');
		vi.spyOn(h.persistence, 'save').mockRejectedValueOnce(
			new Error('disk full'),
		);
		h.interaction.submit(h.cm);
		await vi.waitFor(() => expect(h?.report).toHaveBeenCalledOnce());
		expect(h.editor.getValue()).toContain('keep me');
		expect(h.cm.state.field(quickEditComposer)?.pending).toBe(false);
		expect(h.run).not.toHaveBeenCalled();
	});

	it('reopens persisted draft text without duplicating it or automatically executing', async () => {
		h = await createQuickEditScenario('note');
		await h.interaction.begin(h.editor, h.info);
		h.type('unfinished');
		const instance = h.definition.instances()[0];
		if (!instance) throw new Error('Expected request');
		h.cm.dispatch({ effects: setQuickEditComposer.of(null) });
		await h.interaction.open(instance.id);
		const draft = findQuickEditDraft(h.editor.getValue(), instance.id);
		expect(draft && h.cm.state.sliceDoc(draft.promptFrom, draft.promptTo)).toBe(
			'unfinished',
		);
		expect(h.run).not.toHaveBeenCalled();
	});

	it('keeps existing agent differences while excluding prompt typing and cancellation', async () => {
		h = await createQuickEditScenario('new words');
		h.cm.dispatch({
			effects: setDiffEffect.of({ oldContent: 'old words' }),
			selection: { anchor: 4 },
		});
		await h.interaction.begin(h.editor, h.info);
		h.type('add something');
		const diff = h.cm.state.field(diffField);
		expect(diff.oldContent).toContain('add something');
		expect(diff.oldContent).toContain('old');
		h.interaction.cancel(h.cm);
		expect(h.cm.state.field(diffField).oldContent).toBe('old words');
		expect(h.cm.state.field(diffField).hunks).toHaveLength(1);
		expect(h.editor.getValue()).toBe('new words');
	});

	it.each([false, true])(
		'restores a wrapped selection without accepting an existing agent difference (reopened: %s)',
		async (reopen) => {
			h = await createQuickEditScenario('new words');
			h.cm.dispatch({
				effects: setDiffEffect.of({ oldContent: 'old words' }),
				selection: { anchor: 0, head: 3 },
			});
			await h.interaction.begin(h.editor, h.info);
			h.type(' request');
			if (reopen) {
				const instance = h.definition.instances()[0];
				if (!instance) throw new Error('Expected request');
				h.cm.dispatch({ effects: setQuickEditComposer.of(null) });
				await h.interaction.open(instance.id);
			}
			expect(press(h.cm, 'Escape')).toBe(true);
			expect(h.editor.getValue()).toBe('new words');
			expect(h.cm.state.field(diffField).oldContent).toBe('old words');
		},
	);

	it('restores the original selected text when a persisted draft is reopened', async () => {
		h = await createQuickEditScenario('before request after');
		h.cm.dispatch({ selection: { anchor: 7, head: 14 } });
		await h.interaction.begin(h.editor, h.info);
		const instance = h.definition.instances()[0];
		if (!instance) throw new Error('Expected request');
		h.type(' amended');
		h.cm.dispatch({ effects: setQuickEditComposer.of(null) });
		await h.interaction.open(instance.id);
		expect(press(h.cm, 'Escape')).toBe(true);
		expect(h.editor.getValue()).toBe('before request after');
	});

	it('leaves Enter outside the prompt to the host editor', async () => {
		const outlineEnter = vi.fn(() => true);
		h = await createQuickEditScenario(
			'before after',
			undefined,
			Prec.highest(keymap.of([{ key: 'Enter', run: outlineEnter }])),
		);
		await h.interaction.begin(h.editor, h.info);
		h.cm.dispatch({ selection: { anchor: h.cm.state.doc.length } });
		expect(press(h.cm, 'Enter')).toBe(true);
		expect(outlineEnter).toHaveBeenCalledOnce();
		expect(h.run).not.toHaveBeenCalled();
	});

	it('consumes empty Enter without adding a line or starting an agent', async () => {
		h = await createQuickEditScenario('- note');
		await h.interaction.begin(h.editor, h.info);
		const source = h.editor.getValue();
		expect(press(h.cm, 'Enter')).toBe(true);
		expect(h.editor.getValue()).toBe(source);
		expect(h.run).not.toHaveBeenCalled();
	});

	it('rejects insertion in code without changing the note', async () => {
		h = await createQuickEditScenario('`code`');
		h.cm.dispatch({ selection: { anchor: 2 } });
		await expect(h.interaction.begin(h.editor, h.info)).rejects.toThrow(
			'literal',
		);
		expect(h.editor.getValue()).toBe('`code`');
	});

	it('locks only the request while its save is pending and rejects a second submission', async () => {
		h = await createQuickEditScenario('one suffix');
		h.cm.dispatch({ selection: { anchor: 3 } });
		await h.interaction.begin(h.editor, h.info);
		h.type('request');
		let release: (() => void) | undefined;
		vi.spyOn(h.persistence, 'save').mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					release = resolve;
				}),
		);
		h.interaction.submit(h.cm);
		await vi.waitFor(() => expect(release).toBeTypeOf('function'));
		const snapshot = h.editor.getValue();
		h.type('should not be inserted');
		expect(h.editor.getValue()).toBe(snapshot);
		h.cm.dispatch({
			changes: { from: h.cm.state.doc.length, insert: ' outside' },
		});
		await expect(h.interaction.begin(h.editor, h.info)).rejects.toThrow(
			'submitted',
		);
		release?.();
		await vi.waitFor(() =>
			expect(h?.definition.instances()[0]?.state.get().status).toBe('done'),
		);
		expect(h.disk).toMatch(/ suffix outside$/);
		expect(h.run).toHaveBeenCalledOnce();
	});

	it('does not submit while an IME composition is active', async () => {
		h = await createQuickEditScenario('note');
		await h.interaction.begin(h.editor, h.info);
		h.type('request');
		Object.defineProperty(h.cm, 'composing', { get: () => true });
		expect(press(h.cm, 'Enter')).toBe(false);
		expect(h.run).not.toHaveBeenCalled();
	});

	it('leaves IME confirmation and modified Enter to the host', async () => {
		h = await createQuickEditScenario('note');
		await h.interaction.begin(h.editor, h.info);
		h.type('request');
		expect(press(h.cm, 'Enter', { isComposing: true })).toBe(false);
		expect(press(h.cm, 'Escape', { isComposing: true })).toBe(false);
		expect(press(h.cm, 'Enter', { metaKey: true })).toBe(false);
		expect(h.run).not.toHaveBeenCalled();
		expect(h.cm.state.field(quickEditComposer)).not.toBeNull();
	});

	it('clears composing UI when the source envelope is deleted', async () => {
		h = await createQuickEditScenario('note');
		await h.interaction.begin(h.editor, h.info);
		expect(h.interaction.composing.get()).toBeTruthy();
		h.cm.dispatch({
			changes: { from: 0, to: h.cm.state.doc.length, insert: '' },
		});
		expect(h.interaction.composing.get()).toBeNull();
	});
});
