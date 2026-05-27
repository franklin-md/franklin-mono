import {
	FuseFileCollection,
	type FileCollection,
	type FileReferenceItem,
	type FileSearchOptions,
} from '@franklin/react';
import type { App, EventRef, TAbstractFile, Vault } from 'obsidian';

function createPathSet(vault: Vault): Set<string> {
	return new Set(vault.getFiles().map((file) => file.path));
}

function toItems(paths: Iterable<string>): FileReferenceItem[] {
	return Array.from(paths, (path) => ({ path }));
}

function difference(
	source: ReadonlySet<string>,
	against: ReadonlySet<string>,
): string[] {
	const paths: string[] = [];
	for (const path of source) {
		if (!against.has(path)) {
			paths.push(path);
		}
	}
	return paths;
}

export interface ObsidianFileCollectionOptions {
	readonly debounceMs?: number;
}

const DEFAULT_RECONCILE_DEBOUNCE_MS = 500;

export class ObsidianFileCollection implements FileCollection {
	private readonly collection: FileCollection;
	private readonly debounceMs: number;
	private readonly eventRefs: EventRef[] = [];
	private readonly vault: Vault;
	private disposed = false;
	private indexedPaths: Set<string>;
	private reconcileTimer: ReturnType<Window['setTimeout']> | undefined;

	constructor(app: App, options: ObsidianFileCollectionOptions = {}) {
		this.vault = app.vault;
		this.debounceMs = options.debounceMs ?? DEFAULT_RECONCILE_DEBOUNCE_MS;
		this.indexedPaths = createPathSet(this.vault);
		this.collection = new FuseFileCollection(toItems(this.indexedPaths));

		app.workspace.onLayoutReady(() => {
			this.registerVaultEvents();
		});
	}

	search(
		query: string,
		options?: FileSearchOptions,
	): readonly FileReferenceItem[] {
		return this.collection.search(query, options);
	}

	upsert(items: readonly FileReferenceItem[]): void {
		for (const item of items) {
			this.indexedPaths.add(item.path);
		}
		this.collection.upsert(items);
	}

	remove(paths: readonly string[]): void {
		for (const path of paths) {
			this.indexedPaths.delete(path);
		}
		this.collection.remove(paths);
	}

	subscribe(listener: () => void): () => void {
		return this.collection.subscribe(listener);
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

		const nextPaths = createPathSet(this.vault);
		const removedPaths = difference(this.indexedPaths, nextPaths);
		const addedPaths = difference(nextPaths, this.indexedPaths);
		this.indexedPaths = nextPaths;

		if (removedPaths.length > 0) {
			this.collection.remove(removedPaths);
		}
		if (addedPaths.length > 0) {
			this.collection.upsert(toItems(addedPaths));
		}
	};
}
