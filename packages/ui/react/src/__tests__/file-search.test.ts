import { describe, expect, it, vi } from 'vitest';

import { FuseFileIndex } from '../file-search/fuse-file-index.js';
import type { FileIndexItem } from '../file-search/types.js';

function item(path: string): FileIndexItem<undefined> {
	return { path, metadata: undefined };
}

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
