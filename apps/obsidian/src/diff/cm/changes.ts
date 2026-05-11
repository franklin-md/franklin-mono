import type { Hunk } from '../compute-hunks.js';

export function rejectHunkChange(
	oldContent: string,
	hunk: Hunk,
): { from: number; to: number; insert: string } {
	return {
		from: hunk.newFrom,
		to: hunk.newTo,
		insert: oldContent.slice(hunk.oldFrom, hunk.oldTo),
	};
}

export function acceptHunkChange(
	oldContent: string,
	newContent: string,
	hunk: Hunk,
): string {
	return (
		oldContent.slice(0, hunk.oldFrom) +
		newContent.slice(hunk.newFrom, hunk.newTo) +
		oldContent.slice(hunk.oldTo)
	);
}
