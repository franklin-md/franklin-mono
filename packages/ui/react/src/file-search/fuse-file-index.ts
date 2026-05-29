import { createObserver } from '@franklin/lib';
import Fuse, { type IFuseOptions } from 'fuse.js';

import type { FileIndex, FileIndexItem, FileSearchOptions } from './types.js';

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
} satisfies IFuseOptions<FuseDocument<unknown>>;

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

export class FuseFileIndex<
	TMetadata = unknown,
> implements FileIndex<TMetadata> {
	private readonly observer = createObserver();
	private readonly fuse: Fuse<FuseDocument<TMetadata>>;

	constructor(items: readonly FileIndexItem<TMetadata>[] = []) {
		this.fuse = new Fuse(items.map(createDocument), DEFAULT_FUSE_OPTIONS);
	}

	search(
		query: string,
		options: FileSearchOptions = {},
	): readonly FileIndexItem<TMetadata>[] {
		return this.fuse
			.search(query, { limit: options.limit })
			.map((result) => toIndexItem(result.item));
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
