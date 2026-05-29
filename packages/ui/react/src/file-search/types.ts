export interface FileIndexItem<TMetadata = unknown> {
	readonly path: string;
	readonly metadata: TMetadata;
}

export interface FileSearchOptions {
	readonly limit?: number;
}

export interface FileIndex<TMetadata = unknown> {
	search(
		query: string,
		options?: FileSearchOptions,
	): readonly FileIndexItem<TMetadata>[];
	upsert(items: readonly FileIndexItem<TMetadata>[]): void;
	remove(paths: readonly string[]): void;
	subscribe(listener: () => void): () => void;
}
