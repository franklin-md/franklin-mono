import { describe, expect, it } from 'vitest';
import { computeHunks } from '../../compute-hunks.js';
import { findAddedHunkIdAtPosition } from '../decorations.js';

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
