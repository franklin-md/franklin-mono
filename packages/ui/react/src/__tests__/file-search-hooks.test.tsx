// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
	FileIndexProvider,
	FuseFileIndex,
	useFileIndex,
	useFileSearch,
} from '../file-search/index.js';
import type { FileIndexItem } from '../file-search/types.js';
import type { ReactNode } from 'react';

function paths(items: readonly FileIndexItem[]): string[] {
	return items.map((item) => item.path);
}

function item(path: string): FileIndexItem<undefined> {
	return { path, metadata: undefined };
}

describe('useFileIndex', () => {
	it('returns the nearest provided index', () => {
		const fileIndex = new FuseFileIndex([item('notes/today.md')]);
		const wrapper = ({ children }: { children: ReactNode }) => (
			<FileIndexProvider fileIndex={fileIndex}>{children}</FileIndexProvider>
		);

		const { result } = renderHook(() => useFileIndex(), { wrapper });

		expect(result.current).toBe(fileIndex);
	});

	it('creates a stable fallback index outside a provider', () => {
		const { result, rerender } = renderHook(() => useFileIndex());
		const first = result.current;

		rerender();

		expect(result.current).toBe(first);
	});
});

describe('useFileSearch', () => {
	it('searches and updates when the index changes', () => {
		const fileIndex = new FuseFileIndex([
			item('notes/research/fuse.md'),
			item('notes/today.md'),
		]);
		const { result } = renderHook(() => useFileSearch(fileIndex, 'fuse'));

		expect(paths(result.current)).toEqual(['notes/research/fuse.md']);

		act(() => {
			fileIndex.upsert([item('notes/fuse-later.md')]);
		});

		expect(paths(result.current)).toEqual([
			'notes/research/fuse.md',
			'notes/fuse-later.md',
		]);
	});

	it('updates when the query changes without an index event', () => {
		const fileIndex = new FuseFileIndex([
			item('notes/fuse.md'),
			item('notes/react.md'),
		]);
		const { result, rerender } = renderHook(
			({ query }) => useFileSearch(fileIndex, query),
			{ initialProps: { query: 'fuse' } },
		);

		expect(paths(result.current)).toEqual(['notes/fuse.md']);

		rerender({ query: 'react' });

		expect(paths(result.current)).toEqual(['notes/react.md']);
	});

	it('debounces query changes when configured', () => {
		vi.useFakeTimers();
		const fileIndex = new FuseFileIndex([
			item('notes/fuse.md'),
			item('notes/react.md'),
		]);
		const { result, rerender } = renderHook(
			({ query }) => useFileSearch(fileIndex, query, { debounceMs: 50 }),
			{ initialProps: { query: 'fuse' } },
		);

		expect(paths(result.current)).toEqual(['notes/fuse.md']);

		rerender({ query: 'react' });
		expect(paths(result.current)).toEqual(['notes/fuse.md']);

		act(() => {
			vi.advanceTimersByTime(50);
		});

		expect(paths(result.current)).toEqual(['notes/react.md']);
		vi.useRealTimers();
	});

	it('updates when search options change without an index event', () => {
		const fileIndex = new FuseFileIndex([
			item('notes/fuse.md'),
			item('notes/react.md'),
		]);
		const { result, rerender } = renderHook(
			({ limit }) => useFileSearch(fileIndex, 'notes', { limit }),
			{ initialProps: { limit: 1 } },
		);

		expect(paths(result.current)).toEqual(['notes/fuse.md']);

		rerender({ limit: 2 });

		expect(paths(result.current)).toEqual(['notes/fuse.md', 'notes/react.md']);
	});
});
