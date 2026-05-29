import { createObserver } from '@franklin/lib';
import Fuse, { type FuseSortFunctionArg, type IFuseOptions } from 'fuse.js';

import type {
	FileIndex,
	FileIndexItem,
	FileIndexSortFn,
	FileSearchOptions,
} from './types.js';

interface FuseDocument<TMetadata> extends FileIndexItem<TMetadata> {
	readonly name: string;
}

const DEFAULT_FUSE_OPTIONS = {
	keys: [
		{ name: 'name', weight: 0.7 },
		{ name: 'path', weight: 0.3 },
	],
	threshold: 0.35,
	ignoreLocation: true,
	includeScore: true,
} satisfies IFuseOptions<FuseDocument<unknown>>;

export interface FuseFileIndexOptions<TMetadata = unknown> {
	readonly sortFn?: FileIndexSortFn<TMetadata>;
}

function getPathName(path: string): string {
	const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '');
	return normalized.split('/').at(-1) ?? normalized;
}

function createDocument<TMetadata>(
	item: FileIndexItem<TMetadata>,
): FuseDocument<TMetadata> {
	return {
		...item,
		name: getPathName(item.path),
	};
}

function toIndexItem<TMetadata>(
	item: FileIndexItem<TMetadata>,
): FileIndexItem<TMetadata> {
	return { path: item.path, metadata: item.metadata };
}

function compareSearchResults<TMetadata>(
	documents: readonly FuseDocument<TMetadata>[],
	sortFn: FileIndexSortFn<TMetadata> | undefined,
	left: FuseSortFunctionArg,
	right: FuseSortFunctionArg,
): number {
	const scoreDifference = left.score - right.score;
	if (scoreDifference !== 0) {
		return scoreDifference;
	}

	const leftItem = documents[left.idx];
	const rightItem = documents[right.idx];
	if (sortFn && leftItem && rightItem) {
		const sortDifference = sortFn(leftItem, rightItem);
		if (sortDifference !== 0) {
			return sortDifference;
		}
	}

	return left.idx - right.idx;
}

function compareEmptyQueryItems<TMetadata>(
	sortFn: FileIndexSortFn<TMetadata> | undefined,
	left: { readonly index: number; readonly item: FuseDocument<TMetadata> },
	right: { readonly index: number; readonly item: FuseDocument<TMetadata> },
): number {
	if (sortFn) {
		const sortDifference = sortFn(left.item, right.item);
		if (sortDifference !== 0) {
			return sortDifference;
		}
	}

	return left.index - right.index;
}

export class FuseFileIndex<
	TMetadata = unknown,
> implements FileIndex<TMetadata> {
	private readonly observer = createObserver();
	private readonly documents: FuseDocument<TMetadata>[];
	private readonly fuse: Fuse<FuseDocument<TMetadata>>;
	private readonly sortFn: FileIndexSortFn<TMetadata> | undefined;

	constructor(
		items: readonly FileIndexItem<TMetadata>[] = [],
		options: FuseFileIndexOptions<TMetadata> = {},
	) {
		this.documents = items.map(createDocument);
		this.sortFn = options.sortFn;
		this.fuse = new Fuse(this.documents, {
			...DEFAULT_FUSE_OPTIONS,
			sortFn: (left, right) =>
				compareSearchResults(this.documents, this.sortFn, left, right),
		});
	}

	search(
		query: string,
		options: FileSearchOptions = {},
	): readonly FileIndexItem<TMetadata>[] {
		if (!query.trim()) {
			const results = this.documents
				.map((item, index) => ({ item, index }))
				.sort((left, right) =>
					compareEmptyQueryItems(this.sortFn, left, right),
				);
			const limited =
				options.limit === undefined ? results : results.slice(0, options.limit);
			return limited.map((result) => toIndexItem(result.item));
		}

		const results = this.fuse.search(query);
		const limited =
			options.limit === undefined ? results : results.slice(0, options.limit);
		return limited.map((result) => toIndexItem(result.item));
	}

	upsert(items: readonly FileIndexItem<TMetadata>[]): void {
		if (items.length === 0) return;

		for (const item of items) {
			this.fuse.remove((existing) => existing.path === item.path);
			this.fuse.add(createDocument(item));
		}
		this.notify();
	}

	remove(paths: readonly string[]): void {
		if (paths.length === 0) return;

		for (const path of paths) {
			this.fuse.remove((item) => item.path === path);
		}
		this.notify();
	}

	subscribe(listener: () => void): () => void {
		return this.observer.subscribe(listener);
	}

	private notify(): void {
		// Mutation notifications are intentionally coarse: callers may be notified
		// even when an upsert/remove batch leaves the Fuse index unchanged.
		this.observer.notify();
	}
}
