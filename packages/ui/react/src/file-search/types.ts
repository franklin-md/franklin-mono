export interface FileReferenceItem {
	readonly path: string;
}

export interface FileSearchOptions {
	readonly limit?: number;
}

export interface FileCollection {
	search(
		query: string,
		options?: FileSearchOptions,
	): readonly FileReferenceItem[];
	upsert(items: readonly FileReferenceItem[]): void;
	remove(paths: readonly string[]): void;
	subscribe(listener: () => void): () => void;
}
