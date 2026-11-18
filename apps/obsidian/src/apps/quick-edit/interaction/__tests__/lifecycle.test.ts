// @vitest-environment jsdom
import { undo, redo } from '@codemirror/commands';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { diffField } from '../../../../shared/diff/cm/diff-field.js';
import { setDiffEffect } from '../../../../shared/diff/cm/effects.js';
import { acceptAllHunks } from '../../../../shared/diff/cm/accept-hunk.js';
import { rejectAllHunks } from '../../../../shared/diff/cm/reject-hunk.js';
import { createQuickEditScenario } from '../testing/scenario.js';
import { quickEditComposer } from '../state.js';

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

describe('quick edit completion and file review', () => {
	it('does not map relocated request-row deletion over baseline prose', async () => {
		const target = (h = await createQuickEditScenario('first  prose\nlast'));
		target.cm.dispatch({ selection: { anchor: 6 } });
		target.run.mockImplementationOnce(async ({ directive }) => {
			const baseline = target.editor.getValue();
			target.cm.dispatch({
				effects: setDiffEffect.of({ oldContent: baseline }),
				changes: {
					from: 0,
					to: baseline.length,
					insert: 'first\n' + directive + '\nlast',
				},
			});
		});
		await target.interaction.runPreset(
			target.editor,
			target.info,
			'Remove prose.',
		);
		expect(target.editor.getValue()).toBe('first\nlast');
		expect(target.cm.state.field(diffField).oldContent).toBe(
			'first  prose\nlast',
		);
		rejectAllHunks(target.cm);
		expect(target.editor.getValue()).toBe('first  prose\nlast');
	});
	it.each([false, true])(
		'cleans a relocated control in both versions with existing diffs: %s',
		async (pending) => {
			const target = (h = await createQuickEditScenario('new words'));
			if (pending)
				target.cm.dispatch({
					effects: setDiffEffect.of({ oldContent: 'old words' }),
				});
			target.run.mockImplementationOnce(async ({ directive }) => {
				const source = target.editor.getValue();
				// Simulate the baseline captured by the first agent write, or retain
				// the earlier pending baseline. Exercise separate natural edit hunks.
				if (!pending)
					target.cm.dispatch({
						effects: setDiffEffect.of({ oldContent: source }),
					});
				const from = source.indexOf(directive);
				const words = source.indexOf('words');
				target.cm.dispatch({
					changes: [
						{ from, to: from + directive.length, insert: '' },
						{ from: words, to: words + 5, insert: 'thoughts' },
						{ from: source.length, insert: '\n' + directive },
					],
				});
				expect(target.editor.getValue()).toBe('new thoughts\n' + directive);
			});
			await target.interaction.runPreset(
				target.editor,
				target.info,
				'Improve this.',
			);
			const instance = target.definition.instances()[0];
			if (!instance) throw new Error('Expected request');
			const expectedBaseline = pending ? 'old words' : 'new words';
			expect(target.editor.getValue()).toBe('new thoughts');
			expect(target.cm.state.field(diffField).oldContent).toBe(
				expectedBaseline,
			);
			expect(target.cm.state.field(diffField).hunks.length).toBeGreaterThan(0);

			expect(undo(target.cm)).toBe(true);
			expect(target.editor.getValue()).toContain(instance.text);
			expect(instance.state.get().status).toBe('done');
			await expect(target.interaction.open(instance.id)).rejects.toThrow(
				'complete',
			);
			await expect(
				target.execution.execute(instance.id, 'again'),
			).rejects.toThrow('complete');
			expect(target.cm.state.field(quickEditComposer)).toBeNull();
			expect(redo(target.cm)).toBe(true);
			expect(target.editor.getValue()).toBe('new thoughts');
			expect(target.cm.state.field(diffField).oldContent).toBe(
				expectedBaseline,
			);

			rejectAllHunks(target.cm);
			expect(target.editor.getValue()).toBe(expectedBaseline);
			expect(target.cm.state.field(diffField).hunks).toHaveLength(0);
			expect(undo(target.cm)).toBe(true);
			expect(target.editor.getValue()).toBe('new thoughts');
			acceptAllHunks(target.cm);
			expect(target.cm.state.field(diffField).oldContent).toBe('new thoughts');
			expect(target.cm.state.field(diffField).hunks).toHaveLength(0);
			expect(target.run).toHaveBeenCalledOnce();
		},
	);

	it('Reject all after Undo-restored completion applies content review without rerunning', async () => {
		const target = (h = await createQuickEditScenario('new words'));
		target.cm.dispatch({
			effects: setDiffEffect.of({ oldContent: 'old words' }),
		});
		await target.interaction.runPreset(target.editor, target.info, 'Review.');
		const instance = target.definition.instances()[0];
		if (!instance) throw new Error('Expected request');
		expect(undo(target.cm)).toBe(true);
		rejectAllHunks(target.cm);
		expect(target.editor.getValue()).toBe(instance.text + 'old words');
		expect(instance.state.get().status).toBe('done');
		await target.execution.restore();
		expect(target.run).toHaveBeenCalledOnce();
	});

	it('consumes a wrapped request-only bullet and promotes its children while preserving pending differences', async () => {
		const target = (h = await createQuickEditScenario(
			'- parent\n  - request\n    - new child\n      - grandchild\n  - sibling',
		));
		target.cm.dispatch({
			selection: { anchor: 13, head: 20 },
			effects: setDiffEffect.of({
				oldContent:
					'- parent\n  - request\n    - old child\n      - grandchild\n  - sibling',
			}),
		});
		await target.interaction.begin(target.editor, target.info);
		target.interaction.submit(target.cm);
		await vi.waitFor(() => expect(target.save).toHaveBeenCalledTimes(2));
		expect(target.editor.getValue()).toBe(
			'- parent\n  - new child\n    - grandchild\n  - sibling',
		);
		expect(target.cm.state.field(diffField).oldContent).toBe(
			'- parent\n  - old child\n    - grandchild\n  - sibling',
		);
		rejectAllHunks(target.cm);
		expect(target.editor.getValue()).toBe(
			'- parent\n  - old child\n    - grandchild\n  - sibling',
		);
	});

	it('keeps an unsuccessful relocated request and its explanation for a successful retry', async () => {
		const target = (h = await createQuickEditScenario('note'));
		const reason =
			'No convincing match.\nThe candidate refers to another subject.';
		target.run.mockImplementationOnce(async ({ directive }) => {
			target.cm.dispatch({
				changes: {
					from: 0,
					to: target.cm.state.doc.length,
					insert: 'note\n' + directive,
				},
			});
			throw new Error(reason);
		});
		await target.interaction.runPreset(
			target.editor,
			target.info,
			'Find a related note.',
		);
		const instance = target.definition.instances()[0];
		if (!instance) throw new Error('Expected request');
		expect(instance.state.get()).toMatchObject({
			status: 'failed',
			prompt: 'Find a related note.',
			error: reason,
		});
		expect(target.editor.getValue()).toBe('note\n' + instance.text);
		await target.interaction.open(instance.id);
		target.interaction.submit(target.cm);
		await vi.waitFor(() => expect(instance.state.get().status).toBe('done'));
		expect(target.editor.getValue()).toBe('note');
		expect(target.run).toHaveBeenCalledTimes(2);
	});
});
