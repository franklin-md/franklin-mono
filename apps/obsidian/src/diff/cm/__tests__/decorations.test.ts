import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { computeHunks } from '../../compute-hunks.js';
import { resolveActionPosition } from '../decorations.js';

describe('resolveActionPosition', () => {
	it('anchors eof inserted embedded blocks at the start of the added block', () => {
		const oldContent = 'alpha\n';
		const newContent = 'alpha\n```mermaid\nflowchart TD\nA --> B\n```\n';
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
