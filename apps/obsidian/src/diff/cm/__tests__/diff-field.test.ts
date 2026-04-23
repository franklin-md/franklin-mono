import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { computeHunks } from '../../compute-hunks.js';
import {
	acceptHunkIntoBaseline,
	diffField,
	setBaseline,
	setDiffEntry,
	visibleHunks,
} from '../diff-field.js';

describe('diffField', () => {
	it('folds an accepted insert into the baseline', () => {
		const oldContent = 'Welcome\n';
		const newContent = 'Welcome\nAgent paragraph\n';
		const [hunk] = computeHunks(oldContent, newContent);

		expect(hunk).toBeDefined();
		expect(acceptHunkIntoBaseline(oldContent, newContent, hunk!)).toBe(
			newContent,
		);
	});

	it('recomputes pending hunks against the updated baseline', () => {
		let state = EditorState.create({
			doc: 'alpha\nbeta\ngamma\n',
			extensions: [diffField],
		});

		state = state.update({
			effects: [setDiffEntry.of({ oldContent: 'alpha\ngamma\n' })],
		}).state;

		const [insertHunk] = visibleHunks(state);
		expect(insertHunk?.addedLines).toEqual(['beta']);

		state = state.update({
			effects: [
				setBaseline.of({
					oldContent: acceptHunkIntoBaseline(
						'alpha\ngamma\n',
						state.doc.toString(),
						insertHunk!,
					),
				}),
			],
		}).state;

		expect(visibleHunks(state)).toHaveLength(0);
	});
});
