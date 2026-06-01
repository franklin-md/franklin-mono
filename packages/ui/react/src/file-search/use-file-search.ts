import { useCallback } from 'react';

import { useDebouncedValue } from '../utils/use-debounced-value.js';
import { useStableExternalStore } from '../utils/use-stable-external-store.js';
import type { FileIndex, FileIndexItem } from './types.js';

export interface UseFileSearchOptions {
	readonly limit?: number;
	readonly debounceMs?: number;
}

export function useFileSearch<TMetadata = unknown>(
	fileIndex: FileIndex<TMetadata>,
	query: string,
	options: UseFileSearchOptions = {},
): readonly FileIndexItem<TMetadata>[] {
	const limit = options.limit;
	const debounceMs = options.debounceMs ?? 0;
	const debouncedQuery = useDebouncedValue(query, debounceMs);
	const subscribe = useCallback(
		(listener: () => void) => fileIndex.subscribe(listener),
		[fileIndex],
	);
	const getSnapshot = useCallback(
		() => fileIndex.search(debouncedQuery, { limit }),
		[fileIndex, debouncedQuery, limit],
	);

	return useStableExternalStore(subscribe, getSnapshot);
}
