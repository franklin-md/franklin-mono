// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { redo, undo } from '@codemirror/commands';
import { EditorSelection } from '@codemirror/state';
import { createQuickEditScenario } from '../testing/scenario.js';
import { findQuickEditDraft } from '../draft/find.js';
import { setQuickEditComposer } from '../state.js';
import { setDiffEffect } from '../../../../shared/diff/cm/effects.js';
import { diffField } from '../../../../shared/diff/cm/diff-field.js';

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

it.each(['', 'words', 'first\nsecond'])(
	'places the caret on the query side when opening or refocusing %j',
	async (query) => {
		h = await createQuickEditScenario(`before ${query} after`);
		h.cm.dispatch({ selection: { anchor: 7, head: 7 + query.length } });
		await h.interaction.begin(h.editor, h.info);
		const instance = h.definition.instances()[0];
		if (!instance) throw new Error('Expected request');
		const draft = findQuickEditDraft(h.editor.getValue(), instance.id);
		if (!draft) throw new Error('Expected draft');
		const caret = { head: draft.promptTo, assoc: query ? -1 : 1 };
		expect(h.cm.state.selection.main).toMatchObject(caret);
		h.cm.dispatch({ selection: { anchor: h.cm.state.doc.length } });
		await h.interaction.begin(h.editor, h.info);
		expect(h.cm.state.selection.main).toMatchObject(caret);
		h.cm.dispatch({ effects: setQuickEditComposer.of(null) });
		await h.interaction.open(instance.id);
		expect(h.cm.state.selection.main).toMatchObject(caret);
		h.type(' appended');
		expect(h.editor.getValue()).toContain(`${query} appended<!--`);
		expect(h.editor.getValue()).toMatch(/ after$/);
	},
);

it('clicking an empty input returns typing to the query from surrounding text', async () => {
	h = await createQuickEditScenario('before after');
	h.cm.dispatch({ selection: { anchor: 7 } });
	await h.interaction.begin(h.editor, h.info);
	h.cm.dispatch({ selection: { anchor: h.cm.state.doc.length } });
	const input = h.cm.dom.querySelector('.franklin-quick-edit-prompt');
	if (!input) throw new Error('Expected empty input');
	input.dispatchEvent(
		new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
	);
	h.type('clicked');
	expect(h.editor.getValue()).toContain(':::clicked<!--');
	expect(h.editor.getValue()).toMatch(/after$/);
});

it.each([
	{ boundary: 'promptFrom', outward: -1, inward: 1, query: 'xwords' },
	{ boundary: 'promptTo', outward: 1, inward: -1, query: 'wordsx' },
] as const)(
	'returning across a hidden control places the caret inside $boundary',
	async ({ boundary, outward, inward, query }) => {
		h = await createQuickEditScenario('before words after');
		h.cm.dispatch({ selection: { anchor: 7, head: 12 } });
		await h.interaction.begin(h.editor, h.info);
		const instance = h.definition.instances()[0];
		if (!instance) throw new Error('Expected request');
		const draft = findQuickEditDraft(h.editor.getValue(), instance.id);
		if (!draft) throw new Error('Expected draft');
		// CM's atomic-range navigation returns the side facing the hidden
		// control. Typing here belongs to the query, so its caret must face in.
		h.cm.dispatch({
			selection: EditorSelection.create([
				EditorSelection.cursor(draft[boundary], outward),
			]),
			userEvent: 'select',
		});
		expect(h.cm.state.selection.main.assoc).toBe(inward);
		h.type('x');
		expect(
			h.cm.dom.querySelector('.franklin-quick-edit-prompt')?.textContent,
		).toBe(query);
		expect(h.editor.getValue()).toMatch(/ after$/);
	},
);

it.each(['promptFrom', 'promptTo'] as const)(
	'pasting at %s grows the query and highlight while preserving its pending diff',
	async (boundary) => {
		h = await createQuickEditScenario('before new after');
		h.cm.dispatch({
			selection: { anchor: 7, head: 10 },
			effects: setDiffEffect.of({ oldContent: 'before old after' }),
		});
		await h.interaction.begin(h.editor, h.info);
		const instance = h.definition.instances()[0];
		if (!instance) throw new Error('Expected request');
		const draft = findQuickEditDraft(h.editor.getValue(), instance.id);
		if (!draft) throw new Error('Expected draft');
		h.cm.dispatch({ selection: { anchor: draft[boundary] } });
		const before = h.editor.getValue();
		h.cm.dispatch({
			...h.cm.state.replaceSelection('pasted\ntext'),
			userEvent: 'input.paste',
		});
		const query =
			boundary === 'promptFrom' ? 'pasted\ntextnew' : 'newpasted\ntext';
		const updated = findQuickEditDraft(h.editor.getValue(), instance.id);
		if (!updated) throw new Error('Expected updated draft');
		expect(h.cm.state.sliceDoc(updated.promptFrom, updated.promptTo)).toBe(
			query,
		);
		expect(
			Array.from(
				h.cm.dom.querySelectorAll('.franklin-quick-edit-prompt'),
				(node) => node.textContent,
			).join('\n'),
		).toBe(query);
		expect(h.editor.getValue().slice(updated.to)).toBe(' after');
		const baseline = h.cm.state.field(diffField).oldContent;
		expect(baseline).toContain(
			boundary === 'promptFrom' ? 'pasted\ntextold' : 'oldpasted\ntext',
		);
		expect(undo(h.cm)).toBe(true);
		expect(h.editor.getValue()).toBe(before);
		expect(redo(h.cm)).toBe(true);
		expect(h.cm.state.field(diffField).oldContent).toBe(baseline);
		h.interaction.cancel(h.cm);
		expect(h.editor.getValue()).toBe('before new after');
		expect(h.cm.state.field(diffField).oldContent).toBe('before old after');
	},
);
