import { describe, expect, it, vi } from 'vitest';

import { FuseFileIndex } from '../file-search/fuse-file-index.js';
import type { FileIndexItem, FileIndexSortFn } from '../file-search/types.js';

interface TestMetadata {
	readonly mtime: number;
}

function item(path: string): FileIndexItem<undefined> {
	return { path, metadata: undefined };
}

function itemWithMtime(
	path: string,
	mtime: number,
): FileIndexItem<TestMetadata> {
	return { path, metadata: { mtime } };
}

const sortByMtime: FileIndexSortFn<TestMetadata> = (left, right) =>
	right.metadata.mtime - left.metadata.mtime;

function paths(items: readonly FileIndexItem[]): string[] {
	return items.map((item) => item.path);
}

describe('FuseFileIndex', () => {
	it('returns path matches ranked by Fuse', () => {
		const fileIndex = new FuseFileIndex([
			item('projects/franklin/README.md'),
			item('notes/research/fuse-file-search.md'),
			item('notes/inbox/today.md'),
		]);

		expect(paths(fileIndex.search('fuse', { limit: 2 }))).toEqual([
			'notes/research/fuse-file-search.md',
		]);
	});

	it('returns initial items for an empty query with the requested limit', () => {
		const fileIndex = new FuseFileIndex([
			item('a.md'),
			item('b.md'),
			item('c.md'),
		]);

		expect(paths(fileIndex.search('', { limit: 2 }))).toEqual(['a.md', 'b.md']);
	});

	it('orders empty-query results with the configured sort function', () => {
		const fileIndex = new FuseFileIndex(
			[
				itemWithMtime('old.md', 10),
				itemWithMtime('new.md', 20),
				itemWithMtime('older.md', 5),
			],
			{ sortFn: sortByMtime },
		);

		expect(paths(fileIndex.search('', { limit: 2 }))).toEqual([
			'new.md',
			'old.md',
		]);
	});

	it('uses the configured sort function as a tie-breaker for equivalent fuzzy matches', () => {
		const fileIndex = new FuseFileIndex(
			[
				itemWithMtime('old/draft.md', 10),
				itemWithMtime('new/draft.md', 20),
				itemWithMtime('older/draft.md', 5),
			],
			{ sortFn: sortByMtime },
		);

		expect(paths(fileIndex.search('draft'))).toEqual([
			'new/draft.md',
			'old/draft.md',
			'older/draft.md',
		]);
	});

	it('applies configured tie-breaks before limiting results', () => {
		const fileIndex = new FuseFileIndex(
			[
				itemWithMtime('old/draft.md', 10),
				itemWithMtime('older/draft.md', 5),
				itemWithMtime('new/draft.md', 20),
			],
			{ sortFn: sortByMtime },
		);

		expect(paths(fileIndex.search('draft', { limit: 1 }))).toEqual([
			'new/draft.md',
		]);
	});

	it('keeps stronger fuzzy matches ahead of newer weaker matches', () => {
		const fileIndex = new FuseFileIndex(
			[
				itemWithMtime('notes/tomorrow.md', 10),
				itemWithMtime('notes/today.md', 20),
			],
			{ sortFn: sortByMtime },
		);

		expect(paths(fileIndex.search('tom'))).toEqual([
			'notes/tomorrow.md',
			'notes/today.md',
		]);
	});

	it('upserts by path without duplicating existing items', () => {
		const fileIndex = new FuseFileIndex([item('notes/today.md')]);

		fileIndex.upsert([item('notes/today.md'), item('notes/tomorrow.md')]);

		expect(paths(fileIndex.search('notes'))).toEqual([
			'notes/today.md',
			'notes/tomorrow.md',
		]);
	});

	it('removes items by path', () => {
		const fileIndex = new FuseFileIndex([
			item('notes/today.md'),
			item('notes/tomorrow.md'),
		]);

		fileIndex.remove(['notes/today.md']);

		expect(paths(fileIndex.search('notes'))).toEqual(['notes/tomorrow.md']);
	});

	it('notifies subscribers when a mutation is requested', () => {
		const fileIndex = new FuseFileIndex();
		const listener = vi.fn();
		const unsubscribe = fileIndex.subscribe(listener);

		fileIndex.upsert([item('notes/today.md')]);
		fileIndex.remove(['notes/today.md']);
		fileIndex.remove(['notes/missing.md']);
		unsubscribe();
		fileIndex.upsert([item('notes/tomorrow.md')]);

		expect(listener).toHaveBeenCalledTimes(3);
	});
});
