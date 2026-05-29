import {
	FuseFileIndex,
	type FileIndex,
	type FileIndexItem,
	type FileIndexSortFn,
	type FileSearchOptions,
} from '@franklin/react';
import type { App, EventRef, TAbstractFile, TFile, Vault } from 'obsidian';

export interface ObsidianFileMetadata {
	readonly mtime: number;
}

type ObsidianFileIndexItem = FileIndexItem<ObsidianFileMetadata>;

const sortByMtime: FileIndexSortFn<ObsidianFileMetadata> = (left, right) =>
	right.metadata.mtime - left.metadata.mtime;

function createItem(file: TFile): ObsidianFileIndexItem {
	return { path: file.path, metadata: { mtime: file.stat.mtime } };
}

function createItemMap(vault: Vault): Map<string, ObsidianFileIndexItem> {
	return new Map(vault.getFiles().map((file) => [file.path, createItem(file)]));
}

function difference(
	source: ReadonlyMap<string, ObsidianFileIndexItem>,
	against: ReadonlyMap<string, ObsidianFileIndexItem>,
): string[] {
	const paths: string[] = [];
	for (const path of source.keys()) {
		if (!against.has(path)) {
			paths.push(path);
		}
	}
	return paths;
}

function changedItems(
	source: ReadonlyMap<string, ObsidianFileIndexItem>,
	against: ReadonlyMap<string, ObsidianFileIndexItem>,
): ObsidianFileIndexItem[] {
	const items: ObsidianFileIndexItem[] = [];
	for (const [path, item] of source) {
		if (against.get(path)?.metadata.mtime !== item.metadata.mtime) {
			items.push(item);
		}
	}
	return items;
}

export interface ObsidianFileIndexOptions {
	readonly debounceMs?: number;
}

const DEFAULT_RECONCILE_DEBOUNCE_MS = 500;

export class ObsidianFileIndex implements FileIndex<ObsidianFileMetadata> {
	private readonly fileIndex: FileIndex<ObsidianFileMetadata>;
	private readonly debounceMs: number;
	private readonly eventRefs: EventRef[] = [];
	private readonly vault: Vault;
	private disposed = false;
	private indexedItems: Map<string, ObsidianFileIndexItem>;
	private reconcileTimer: ReturnType<Window['setTimeout']> | undefined;

	constructor(app: App, options: ObsidianFileIndexOptions = {}) {
		this.vault = app.vault;
		this.debounceMs = options.debounceMs ?? DEFAULT_RECONCILE_DEBOUNCE_MS;
		this.indexedItems = createItemMap(this.vault);
		this.fileIndex = new FuseFileIndex(Array.from(this.indexedItems.values()), {
			sortFn: sortByMtime,
		});

		app.workspace.onLayoutReady(() => {
			this.registerVaultEvents();
		});
	}

	search(
		query: string,
		options?: FileSearchOptions,
	): readonly ObsidianFileIndexItem[] {
		return this.fileIndex.search(query, options);
	}

	upsert(items: readonly ObsidianFileIndexItem[]): void {
		for (const item of items) {
			this.indexedItems.set(item.path, item);
		}
		this.fileIndex.upsert(items);
	}

	remove(paths: readonly string[]): void {
		for (const path of paths) {
			this.indexedItems.delete(path);
		}
		this.fileIndex.remove(paths);
	}

	subscribe(listener: () => void): () => void {
		return this.fileIndex.subscribe(listener);
	}

	dispose(): void {
		this.disposed = true;
		if (this.reconcileTimer) {
			activeWindow.clearTimeout(this.reconcileTimer);
			this.reconcileTimer = undefined;
		}

		for (const eventRef of this.eventRefs) {
			this.vault.offref(eventRef);
		}
		this.eventRefs.length = 0;
	}

	private registerVaultEvents(): void {
		if (this.disposed) {
			return;
		}

		this.eventRefs.push(
			this.vault.on('create', this.scheduleReconcile),
			this.vault.on('delete', this.scheduleReconcile),
			this.vault.on('modify', this.scheduleReconcile),
			this.vault.on('rename', this.scheduleReconcile),
		);
	}

	private readonly scheduleReconcile = (_file?: TAbstractFile): void => {
		if (this.disposed) {
			return;
		}

		// Obsidian path indexing has two noisy edges:
		// - startup can dispatch create events for already-loaded files;
		// - folder rename/delete events represent many file path changes.
		// Debouncing lets those bursts settle, then one fresh getFiles() snapshot
		// becomes the authoritative next path set.
		if (this.reconcileTimer) {
			activeWindow.clearTimeout(this.reconcileTimer);
		}
		this.reconcileTimer = activeWindow.setTimeout(
			this.reconcileNow,
			this.debounceMs,
		);
	};

	private readonly reconcileNow = (): void => {
		this.reconcileTimer = undefined;
		if (this.disposed) {
			return;
		}

		const nextItems = createItemMap(this.vault);
		const removedPaths = difference(this.indexedItems, nextItems);
		const changed = changedItems(nextItems, this.indexedItems);
		this.indexedItems = nextItems;

		// Full-snapshot reconciliation keeps folder rename/delete handling simple.
		// If large vaults make this path hot, prefer a measured rebuild threshold
		// over adding a more complex incremental index model preemptively.
		if (removedPaths.length > 0) {
			this.fileIndex.remove(removedPaths);
		}
		if (changed.length > 0) {
			this.fileIndex.upsert(changed);
		}
	};
}
