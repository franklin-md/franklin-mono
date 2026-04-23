import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { computeHunks } from '../../compute-hunks.js';
import {
	findAddedHunkIdAtPosition,
	resolveActionPosition,
} from '../decorations.js';

describe('findAddedHunkIdAtPosition', () => {
	it('matches an inserted table at the end of the file', () => {
		const oldContent = 'alpha\n';
		const newContent = 'alpha\n| a | b |\n| - | - |\n| 1 | 2 |\n';
		const [hunk] = computeHunks(oldContent, newContent);

		expect(hunk).toBeDefined();
		expect(findAddedHunkIdAtPosition([hunk!], hunk!.newFrom)).toBe(hunk!.id);
		expect(findAddedHunkIdAtPosition([hunk!], hunk!.newTo)).toBe(hunk!.id);
	});

	it('ignores positions outside inserted ranges', () => {
		const oldContent = 'alpha\n';
		const newContent = 'alpha\nbeta\n';
		const [hunk] = computeHunks(oldContent, newContent);

		expect(hunk).toBeDefined();
		expect(findAddedHunkIdAtPosition([hunk!], 0)).toBeNull();
	});
});

describe('resolveActionPosition', () => {
	it('anchors eof inserted tables at the start of the added block', () => {
		const oldContent = 'alpha\n';
		const newContent = 'alpha\n| a | b |\n| - | - |\n| 1 | 2 |\n';
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });

		expect(hunk).toBeDefined();
		expect(resolveActionPosition(state.doc, hunk!, [hunk!])).toBe(
			hunk!.newFrom,
		);
	});

	it('anchors non-eof added hunks on the next visible line', () => {
		const oldContent = 'alpha\nomega\n';
		const newContent = 'alpha\nbeta\nomega\n';
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });

		expect(hunk).toBeDefined();
		expect(resolveActionPosition(state.doc, hunk!, [hunk!])).toBe(
			state.doc.line(3).from,
		);
	});
});
