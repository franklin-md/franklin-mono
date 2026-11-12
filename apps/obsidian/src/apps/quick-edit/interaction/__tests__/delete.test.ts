// @vitest-environment jsdom
import { StateEffect, Prec } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { keymap } from '@codemirror/view';
import { defaultKeymap, redo, undo } from '@codemirror/commands';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDirectiveExtension } from '../../../../shared/directives/live-preview/extension.js';
import { setDiffEffect } from '../../../../shared/diff/cm/effects.js';
import { diffField } from '../../../../shared/diff/cm/diff-field.js';
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
// Exercise the real directive decorations and atomic ranges without React's host portals.
vi.mock('../../../../shared/ui/mount.js', () => ({
	createMounter: () => ({ mount: () => {}, unmount: () => {} }),
}));

let h: Awaited<ReturnType<typeof createQuickEditScenario>> | undefined;
afterEach(async () => {
	await h?.dispose();
	h = undefined;
	document.body.replaceChildren();
});

async function setup(selected = true, hostExtensions: Extension = []) {
	h = await createQuickEditScenario('left new right', undefined, [
		hostExtensions,
		keymap.of(defaultKeymap),
	]);
	h.cm.dispatch({
		effects: StateEffect.appendConfig.of(createDirectiveExtension(h.registry)),
	});
	h.cm.dispatch({
		effects: setDiffEffect.of({ oldContent: 'left old right' }),
		selection: { anchor: 5, head: selected ? 8 : 5 },
	});
	await h.interaction.begin(h.editor, h.info);
	h.type(' amended');
	const instance = h.definition.instances()[0];
	if (!instance) throw new Error('Expected request');
	const draft = findQuickEditDraft(h.editor.getValue(), instance.id);
	if (!draft) throw new Error('Expected draft');
	return { ...h, instance, draft };
}

function press(target: Awaited<ReturnType<typeof setup>>, key: string) {
	const event = new KeyboardEvent('keydown', {
		key,
		bubbles: true,
		cancelable: true,
	});
	target.cm.contentDOM.dispatchEvent(event);
	expect(event.defaultPrevented).toBe(true);
}

const boundaries = [
	{ boundary: 'from', key: 'Delete' },
	{ boundary: 'promptFrom', key: 'Backspace' },
	{ boundary: 'promptTo', key: 'Delete' },
	{ boundary: 'to', key: 'Backspace' },
] as const;

it.each([false, true])(
	'handles Backspace before a host binding that only moves across the marker (inactive: %s)',
	async (inactive) => {
		const earlier = vi.fn((view: EditorView) => {
			view.dispatch({ selection: { anchor: 5 } });
			return true;
		});
		const target = await setup(
			true,
			Prec.highest(keymap.of([{ key: 'Backspace', run: earlier }])),
		);
		if (inactive)
			target.cm.dispatch({ effects: setQuickEditComposer.of(null) });
		target.cm.dispatch({ selection: { anchor: target.draft.promptFrom } });
		press(target, 'Backspace');
		expect(earlier).not.toHaveBeenCalled();
		expect(target.editor.getValue()).toBe('left new right');
		expect(target.cm.state.field(diffField).oldContent).toBe('left old right');
	},
);

describe.each([false, true])(
	'deleting quick edit controls (inactive draft: %s)',
	(inactive) => {
		it.each(boundaries)(
			'$key at $boundary restores the selected text and its pending diff',
			async ({ boundary, key }) => {
				const target = await setup();
				if (inactive)
					target.cm.dispatch({ effects: setQuickEditComposer.of(null) });
				target.cm.dispatch({ selection: { anchor: target.draft[boundary] } });
				press(target, key);
				expect(target.editor.getValue()).toBe('left new right');
				expect(target.cm.state.selection.main).toMatchObject({
					anchor: 5,
					head: 8,
				});
				expect(target.cm.state.field(diffField).oldContent).toBe(
					'left old right',
				);
				expect(target.cm.state.field(quickEditComposer)).toBeNull();
				expect(target.run).not.toHaveBeenCalled();
			},
		);
	},
);

it('deleting the whole envelope restores the selection and supports undo/redo', async () => {
	const target = await setup();
	const source = target.editor.getValue();
	const baseline = target.cm.state.field(diffField).oldContent;
	target.cm.dispatch({
		selection: { anchor: target.draft.from, head: target.draft.to },
	});
	press(target, 'Delete');
	expect(target.editor.getValue()).toBe('left new right');
	expect(target.cm.state.field(diffField).oldContent).toBe('left old right');
	expect(undo(target.cm)).toBe(true);
	expect(target.editor.getValue()).toBe(source);
	expect(target.cm.state.field(diffField).oldContent).toBe(baseline);
	expect(redo(target.cm)).toBe(true);
	expect(target.editor.getValue()).toBe('left new right');
	expect(target.cm.state.field(diffField).oldContent).toBe('left old right');
});

it.each(['Backspace', 'Delete'])(
	'%s inside the query edits text normally',
	async (key) => {
		const target = await setup();
		const position = target.draft.promptFrom + (key === 'Backspace' ? 1 : 0);
		target.cm.dispatch({ selection: { anchor: position } });
		press(target, key);
		const draft = findQuickEditDraft(
			target.editor.getValue(),
			target.instance.id,
		);
		expect(
			draft && target.cm.state.sliceDoc(draft.promptFrom, draft.promptTo),
		).toBe('ew amended');
		expect(target.cm.state.field(quickEditComposer)?.id).toBe(
			target.instance.id,
		);
	},
);

it('deleting an unselected request leaves the surrounding note intact', async () => {
	const target = await setup(false);
	target.cm.dispatch({ selection: { anchor: target.draft.promptFrom } });
	press(target, 'Backspace');
	expect(target.editor.getValue()).toBe('left new right');
	expect(target.cm.state.field(diffField).oldContent).toBe('left old right');
});
