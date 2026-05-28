import { describe, expect, it, vi } from 'vitest';

import { FuseFileCollection } from '../file-search/fuse-file-collection.js';
import type { FileReferenceItem } from '../file-search/types.js';

function paths(items: readonly FileReferenceItem[]): string[] {
	return items.map((item) => item.path);
}

describe('FuseFileCollection', () => {
	it('returns path matches ranked by Fuse', () => {
		const collection = new FuseFileCollection([
			{ path: 'projects/franklin/README.md' },
			{ path: 'notes/research/fuse-file-search.md' },
			{ path: 'notes/inbox/today.md' },
		]);

		expect(paths(collection.search('fuse', { limit: 2 }))).toEqual([
			'notes/research/fuse-file-search.md',
		]);
	});

	it('returns initial items for an empty query with the requested limit', () => {
		const collection = new FuseFileCollection([
			{ path: 'a.md' },
			{ path: 'b.md' },
			{ path: 'c.md' },
		]);

		expect(paths(collection.search('', { limit: 2 }))).toEqual([
			'a.md',
			'b.md',
		]);
	});

	it('upserts by path without duplicating existing items', () => {
		const collection = new FuseFileCollection([{ path: 'notes/today.md' }]);

		collection.upsert([
			{ path: 'notes/today.md' },
			{ path: 'notes/tomorrow.md' },
		]);

		expect(paths(collection.search('notes'))).toEqual([
			'notes/today.md',
			'notes/tomorrow.md',
		]);
	});

	it('removes items by path', () => {
		const collection = new FuseFileCollection([
			{ path: 'notes/today.md' },
			{ path: 'notes/tomorrow.md' },
		]);

		collection.remove(['notes/today.md']);

		expect(paths(collection.search('notes'))).toEqual(['notes/tomorrow.md']);
	});

	it('notifies subscribers when a mutation is requested', () => {
		const collection = new FuseFileCollection();
		const listener = vi.fn();
		const unsubscribe = collection.subscribe(listener);

		collection.upsert([{ path: 'notes/today.md' }]);
		collection.remove(['notes/today.md']);
		collection.remove(['notes/missing.md']);
		unsubscribe();
		collection.upsert([{ path: 'notes/tomorrow.md' }]);

		expect(listener).toHaveBeenCalledTimes(3);
	});
});
