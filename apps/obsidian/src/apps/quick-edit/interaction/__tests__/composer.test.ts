// @vitest-environment jsdom
import { runScopeHandlers } from '@codemirror/view';
import { setDiffEffect } from '../../../../shared/diff/cm/effects.js';
import { diffField } from '../../../../shared/diff/cm/diff-field.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQuickEditScenario } from '../testing/scenario.js';
import { findQuickEditDraft } from '../draft.js';
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

let h: Awaited<ReturnType<typeof createQuickEditScenario>> | undefined;
afterEach(async () => {
	await h?.dispose();
	h = undefined;
	document.body.replaceChildren();
});

describe('native quick edit interaction', () => {
	it('cancels without deleting the selected passage or existing suffix', async () => {
		h = await createQuickEditScenario('alpha beta');
		h.cm.dispatch({ selection: { anchor: 0, head: 5 } });
		await h.interaction.begin(h.editor, h.info);
		h.type('add more');
		expect(h.editor.getValue()).toMatch(/^alpha:::franklin:quick-edit:/);
		expect(h.editor.getValue()).toMatch(/ beta$/);
		h.interaction.cancel(h.cm);
		expect(h.editor.getValue()).toBe('alpha beta');
		expect(h.cm.state.selection.main).toMatchObject({ anchor: 0, head: 5 });
		expect(h.run).not.toHaveBeenCalled();
	});

	it('runs Enter, supports multiline requests and saves the note before execution', async () => {
		h = await createQuickEditScenario('before after');
		h.cm.dispatch({ selection: { anchor: 6 } });
		await h.interaction.begin(h.editor, h.info);
		h.type('add below');
		expect(
			runScopeHandlers(
				h.cm,
				new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }),
				'editor',
			),
		).toBe(true);
		h.type('keep the outline');
		expect(
			runScopeHandlers(
				h.cm,
				new KeyboardEvent('keydown', { key: 'Enter' }),
				'editor',
			),
		).toBe(true);
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
		expect(h.save).toHaveBeenCalledOnce();
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

	it('reopens a completed prompt and Escape preserves the pill and original selection', async () => {
		h = await createQuickEditScenario('before after');
		await h.interaction.begin(h.editor, h.info);
		h.type('fix');
		h.interaction.submit(h.cm);
		await vi.waitFor(() =>
			expect(h?.definition.instances()[0]?.state.get().status).toBe('done'),
		);
		const completed = h.editor.getValue();
		h.cm.dispatch({ selection: { anchor: completed.length } });
		const instance = h.definition.instances()[0];
		if (!instance) throw new Error('Expected request');
		await h.interaction.open(instance.id);
		h.type(' amended');
		h.interaction.cancel(h.cm);
		expect(h.editor.getValue()).toBe(completed);
		expect(h.cm.state.selection.main.head).toBe(completed.length);
		expect(instance.state.get()).toMatchObject({
			status: 'done',
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

	it('leaves Enter outside the prompt to the host editor', async () => {
		h = await createQuickEditScenario('before after');
		await h.interaction.begin(h.editor, h.info);
		h.cm.dispatch({ selection: { anchor: h.cm.state.doc.length } });
		expect(
			runScopeHandlers(
				h.cm,
				new KeyboardEvent('keydown', { key: 'Enter' }),
				'editor',
			),
		).toBe(false);
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
});
