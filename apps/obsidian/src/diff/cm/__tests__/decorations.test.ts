// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Range } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import type { Decoration, EditorView } from '@codemirror/view';
import { computeHunks } from '../../compute-hunks.js';
import {
	actionDecorations,
	DiffHunkActionsBlockWidget,
	DiffHunkActionsWidget,
} from '../decorations/actions.js';
import { addedLineDecorations } from '../decorations/added-line.js';
import {
	RemovedHunkWidget,
	removedLineDecorations,
} from '../decorations/deleted-line.js';
import {
	resolveActionPosition,
	resolveAnchorPosition,
} from '../decorations/utils.js';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('resolveActionPosition', () => {
	it('anchors inline on the empty trailing line when the doc ends in a newline', () => {
		const oldContent = 'alpha\n';
		const newContent = 'alpha\n```mermaid\nflowchart TD\nA --> B\n```\n';
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });

		expect(hunk).toBeDefined();
		expect(resolveActionPosition(state.doc, hunk!)).toEqual({
			kind: 'inline',
			pos: state.doc.line(state.doc.lines).from,
		});
	});

	it('anchors non-eof added hunks inline on the next visible line', () => {
		const oldContent = 'alpha\nomega\n';
		const newContent = 'alpha\nbeta\nomega\n';
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });

		expect(hunk).toBeDefined();
		expect(resolveActionPosition(state.doc, hunk!)).toEqual({
			kind: 'inline',
			pos: state.doc.line(3).from,
		});
	});

	it('falls back to a block widget at doc end when no line follows the hunk', () => {
		const oldContent = 'alpha';
		const newContent = 'alpha\nbeta';
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });

		expect(hunk).toBeDefined();
		expect(resolveActionPosition(state.doc, hunk!)).toEqual({
			kind: 'block',
			pos: state.doc.length,
		});
	});
});

describe('addedLineDecorations', () => {
	it('returns no decorations for hunks without added lines', () => {
		const oldContent = 'alpha\nbeta\n';
		const newContent = 'alpha\n';
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });

		expect(hunk).toBeDefined();
		expect(addedLineDecorations(state.doc, hunk!)).toEqual([]);
	});

	it('marks a single added line as both first and last', () => {
		const oldContent = 'alpha\nomega\n';
		const newContent = 'alpha\nbeta\nomega\n';
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });

		expect(hunk).toBeDefined();
		const [decoration] = addedLineDecorations(state.doc, hunk!);

		expect(decoration?.from).toBe(state.doc.line(2).from);
		expect(decorationClass(decoration!)).toBe(
			'diff-plugin-added-line diff-plugin-added-first diff-plugin-added-last',
		);
		expect(decorationAttributes(decoration!)).toEqual({
			'data-diff-hunk-id': hunk!.id,
		});
	});

	it('marks only the first and last lines in a multi-line added hunk', () => {
		const oldContent = 'alpha\nomega\n';
		const newContent = 'alpha\nbeta\ngamma\nomega\n';
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });

		expect(hunk).toBeDefined();
		const decorations = addedLineDecorations(state.doc, hunk!);

		expect(decorations).toHaveLength(2);
		expect(decorations.map((decoration) => decoration.from)).toEqual([
			state.doc.line(2).from,
			state.doc.line(3).from,
		]);
		expect(decorations.map(decorationClass)).toEqual([
			'diff-plugin-added-line diff-plugin-added-first',
			'diff-plugin-added-line diff-plugin-added-last',
		]);
		expect(decorations.map(decorationAttributes)).toEqual([
			{ 'data-diff-hunk-id': hunk!.id },
			{ 'data-diff-hunk-id': hunk!.id },
		]);
	});
});

describe('removedLineDecorations', () => {
	it('returns no decorations for hunks without removed lines', () => {
		const oldContent = 'alpha\n';
		const newContent = 'alpha\nbeta\n';
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });

		expect(hunk).toBeDefined();
		expect(removedLineDecorations(state.doc, hunk!)).toEqual([]);
	});

	it('returns a block widget decoration at the hunk anchor', () => {
		const oldContent = 'alpha\nbeta\nomega\n';
		const newContent = 'alpha\nomega\n';
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });

		expect(hunk).toBeDefined();
		const [decoration] = removedLineDecorations(state.doc, hunk!);
		const anchor = resolveAnchorPosition(state.doc, hunk!);
		const spec = decorationSpec(decoration!);

		expect(decoration?.from).toBe(anchor.pos);
		expect(spec.block).toBe(true);
		expect(spec.side).toBe(anchor.side);
		expect(spec.widget).toBeInstanceOf(RemovedHunkWidget);
	});
});

describe('actionDecorations', () => {
	it('returns no decorations when the hunk is not hovered', () => {
		const oldContent = 'alpha\nomega\n';
		const newContent = 'alpha\nbeta\nomega\n';
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });

		expect(hunk).toBeDefined();
		expect(actionDecorations(state.doc, hunk!, null)).toEqual([]);
	});

	it('returns an inline action widget decoration for the hovered hunk', () => {
		const oldContent = 'alpha\nomega\n';
		const newContent = 'alpha\nbeta\nomega\n';
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });

		expect(hunk).toBeDefined();
		const [decoration] = actionDecorations(state.doc, hunk!, hunk!.id);
		const spec = decorationSpec(decoration!);

		expect(decoration?.from).toBe(state.doc.line(3).from);
		expect(spec.side).toBe(1);
		expect(spec.block).toBeUndefined();
		expect(spec.widget).toBeInstanceOf(DiffHunkActionsWidget);
	});

	it('returns an inline action widget decoration for embedded hunks', () => {
		const oldContent = 'alpha\n';
		const newContent = 'alpha\n```mermaid\nflowchart TD\nA --> B\n```\n';
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });

		expect(hunk).toBeDefined();
		const [decoration] = actionDecorations(state.doc, hunk!, hunk!.id);
		const spec = decorationSpec(decoration!);

		expect(decoration?.from).toBe(state.doc.line(state.doc.lines).from);
		expect(spec.widget).toBeInstanceOf(DiffHunkActionsWidget);
	});

	it('returns a block action widget decoration when the hunk has no line below', () => {
		const oldContent = 'alpha';
		const newContent = 'alpha\nbeta';
		const [hunk] = computeHunks(oldContent, newContent);
		const state = EditorState.create({ doc: newContent });

		expect(hunk).toBeDefined();
		const [decoration] = actionDecorations(state.doc, hunk!, hunk!.id);
		const spec = decorationSpec(decoration!);

		expect(decoration?.from).toBe(state.doc.length);
		expect(spec.side).toBe(1);
		expect(spec.block).toBe(true);
		expect(spec.widget).toBeInstanceOf(DiffHunkActionsBlockWidget);
	});

	it('creates action DOM without Obsidian document helper methods', () => {
		const oldContent = 'alpha\nomega\n';
		const newContent = 'alpha\nbeta\nomega\n';
		const [hunk] = computeHunks(oldContent, newContent);
		expect(hunk).toBeDefined();
		vi.stubGlobal('activeDocument', document);

		const host = new DiffHunkActionsWidget(hunk!).toDOM({} as EditorView);

		expect(host.tagName).toBe('SPAN');
		expect(host.dataset.diffHunkId).toBe(hunk!.id);
		expect(host.querySelectorAll('button')).toHaveLength(2);
		expect(host.isConnected).toBe(false);
	});

	it('creates a block action DOM with buttons', () => {
		const oldContent = 'alpha';
		const newContent = 'alpha\nbeta';
		const [hunk] = computeHunks(oldContent, newContent);
		expect(hunk).toBeDefined();
		vi.stubGlobal('activeDocument', document);

		const host = new DiffHunkActionsBlockWidget(hunk!).toDOM({} as EditorView);

		expect(host.tagName).toBe('DIV');
		expect(host.className).toBe('diff-plugin-actions-block');
		expect(host.dataset.diffHunkId).toBe(hunk!.id);
		expect(host.querySelectorAll('button')).toHaveLength(2);
	});
});

function decorationClass(decoration: Range<Decoration>): string | undefined {
	return decorationSpec(decoration).class;
}

function decorationAttributes(
	decoration: Range<Decoration>,
): Record<string, string> | undefined {
	return decorationSpec(decoration).attributes;
}

function decorationSpec(decoration: Range<Decoration>): {
	class?: string;
	attributes?: Record<string, string>;
	block?: boolean;
	side?: number;
	widget?: unknown;
} {
	return (
		decoration.value as unknown as {
			spec: {
				class?: string;
				attributes?: Record<string, string>;
				block?: boolean;
				side?: number;
				widget?: unknown;
			};
		}
	).spec;
}
