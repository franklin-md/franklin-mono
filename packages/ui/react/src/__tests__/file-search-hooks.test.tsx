// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
	FileCollectionProvider,
	FuseFileCollection,
	useFileCollection,
	useFileSearch,
} from '../file-search/index.js';
import type { FileReferenceItem } from '../file-search/types.js';
import type { ReactNode } from 'react';

function paths(items: readonly FileReferenceItem[]): string[] {
	return items.map((item) => item.path);
}

describe('useFileCollection', () => {
	it('returns the nearest provided collection', () => {
		const collection = new FuseFileCollection([{ path: 'notes/today.md' }]);
		const wrapper = ({ children }: { children: ReactNode }) => (
			<FileCollectionProvider collection={collection}>
				{children}
			</FileCollectionProvider>
		);

		const { result } = renderHook(() => useFileCollection(), { wrapper });

		expect(result.current).toBe(collection);
	});

	it('creates a stable fallback collection outside a provider', () => {
		const { result, rerender } = renderHook(() => useFileCollection());
		const first = result.current;

		rerender();

		expect(result.current).toBe(first);
	});
});

describe('useFileSearch', () => {
	it('searches and updates when the collection changes', () => {
		const collection = new FuseFileCollection([
			{ path: 'notes/research/fuse.md' },
			{ path: 'notes/today.md' },
		]);
		const { result } = renderHook(() => useFileSearch(collection, 'fuse'));

		expect(paths(result.current)).toEqual(['notes/research/fuse.md']);

		act(() => {
			collection.upsert([{ path: 'notes/fuse-later.md' }]);
		});

		expect(paths(result.current)).toEqual([
			'notes/research/fuse.md',
			'notes/fuse-later.md',
		]);
	});

	it('updates when the query changes without a collection event', () => {
		const collection = new FuseFileCollection([
			{ path: 'notes/fuse.md' },
			{ path: 'notes/react.md' },
		]);
		const { result, rerender } = renderHook(
			({ query }) => useFileSearch(collection, query),
			{ initialProps: { query: 'fuse' } },
		);

		expect(paths(result.current)).toEqual(['notes/fuse.md']);

		rerender({ query: 'react' });

		expect(paths(result.current)).toEqual(['notes/react.md']);
	});

	it('updates when search options change without a collection event', () => {
		const collection = new FuseFileCollection([
			{ path: 'notes/fuse.md' },
			{ path: 'notes/react.md' },
		]);
		const { result, rerender } = renderHook(
			({ limit }) => useFileSearch(collection, 'notes', { limit }),
			{ initialProps: { limit: 1 } },
		);

		expect(paths(result.current)).toEqual(['notes/fuse.md']);

		rerender({ limit: 2 });

		expect(paths(result.current)).toEqual(['notes/fuse.md', 'notes/react.md']);
	});
});
