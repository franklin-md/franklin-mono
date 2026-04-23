import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { computeHunks } from '../../compute-hunks.js';
import {
	assignEmbeddedSourceBlocks,
	findEmbeddedSourceBlocks,
	findHunkIdForEmbeddedSourceBlock,
	findVisibleEmbeddedSourceBlocks,
} from '../embedded-source-blocks.js';

describe('findEmbeddedSourceBlocks', () => {
	it('finds multiple rendered diagrams in document order', () => {
		const content = [
			'# Title',
			'',
			'```mermaid',
			'flowchart TD',
			'A --> B',
			'```',
			'',
			'```mermaid',
			'flowchart LR',
			'X --> Y',
			'```',
			'',
		].join('\n');
		const state = EditorState.create({ doc: content });

		expect(findEmbeddedSourceBlocks(state.doc)).toEqual([
			{
				kind: 'diagram',
				from: state.doc.line(3).from,
				to: state.doc.line(7).from,
			},
			{
				kind: 'diagram',
				from: state.doc.line(8).from,
				to: state.doc.line(12).from,
			},
		]);
	});
});

describe('findVisibleEmbeddedSourceBlocks', () => {
	it('finds rendered mermaid and table source ranges in visible content', () => {
		const content = [
			'# Title',
			'',
			'```mermaid',
			'flowchart TD',
			'A --> B',
			'```',
			'',
			'| a | b |',
			'| --- | --- |',
			'| 1 | 2 |',
			'',
		].join('\n');
		const state = EditorState.create({ doc: content });

		expect(
			findVisibleEmbeddedSourceBlocks(state.doc, [
				{ from: 0, to: state.doc.length },
			]),
		).toEqual([
			{
				kind: 'diagram',
				from: state.doc.line(3).from,
				to: state.doc.line(7).from,
			},
			{
				kind: 'table',
				from: state.doc.line(8).from,
				to: state.doc.line(11).from,
			},
		]);
	});

	it('filters embedded source blocks to the current visible range', () => {
		const content = [
			'```mermaid',
			'flowchart TD',
			'A --> B',
			'```',
			'',
			'| a | b |',
			'| --- | --- |',
			'| 1 | 2 |',
			'',
		].join('\n');
		const state = EditorState.create({ doc: content });

		expect(
			findVisibleEmbeddedSourceBlocks(state.doc, [
				{
					from: state.doc.line(6).from,
					to: state.doc.length,
				},
			]),
		).toEqual([
			{
				kind: 'table',
				from: state.doc.line(6).from,
				to: state.doc.length,
			},
		]);
	});
});

describe('assignEmbeddedSourceBlocks', () => {
	it('matches multiple diagrams by nearest source position', () => {
		const content = [
			'# Title',
			'',
			'```mermaid',
			'flowchart TD',
			'A --> B',
			'```',
			'',
			'```mermaid',
			'flowchart LR',
			'X --> Y',
			'```',
			'',
		].join('\n');
		const state = EditorState.create({ doc: content });
		const blocks = findEmbeddedSourceBlocks(state.doc);
		const firstWidget = { id: 'first' };
		const secondWidget = { id: 'second' };

		const assignments = assignEmbeddedSourceBlocks(
			[
				{
					value: firstWidget,
					kind: 'diagram',
					position: state.doc.line(3).from,
				},
				{
					value: secondWidget,
					kind: 'diagram',
					position: state.doc.line(8).from,
				},
			],
			blocks,
		);

		expect(assignments.get(firstWidget)).toEqual(blocks[0]);
		expect(assignments.get(secondWidget)).toEqual(blocks[1]);
	});
});

describe('findHunkIdForEmbeddedSourceBlock', () => {
	it('maps an inserted mermaid block to its overlapping hunk', () => {
		const oldContent = '# Title\n';
		const newContent = [
			'# Title',
			'```mermaid',
			'flowchart TD',
			'A --> B',
			'```',
			'',
		].join('\n');
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });
		const [diagramBlock] = findVisibleEmbeddedSourceBlocks(state.doc, [
			{ from: 0, to: state.doc.length },
		]);

		expect(hunk).toBeDefined();
		expect(diagramBlock).toBeDefined();
		expect(findHunkIdForEmbeddedSourceBlock([hunk!], diagramBlock!)).toBe(
			hunk!.id,
		);
	});

	it('does not map an accepted diagram onto a later codeblock hunk', () => {
		const oldContent = [
			'# Title',
			'```mermaid',
			'flowchart TD',
			'A --> B',
			'```',
			'',
		].join('\n');
		const newContent = [
			'# Title',
			'```mermaid',
			'flowchart TD',
			'A --> B',
			'```',
			'',
			'```python',
			'print("Hello, world!")',
			'```',
			'',
		].join('\n');
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });
		const [diagramBlock] = findVisibleEmbeddedSourceBlocks(state.doc, [
			{ from: 0, to: state.doc.length },
		]);

		expect(hunk).toBeDefined();
		expect(diagramBlock).toBeDefined();
		expect(findHunkIdForEmbeddedSourceBlock([hunk!], diagramBlock!)).toBeNull();
	});
});
