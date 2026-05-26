import { useCallback } from 'react';

import { useDebouncedValue } from '../utils/use-debounced-value.js';
import { useStableExternalStore } from '../utils/use-stable-external-store.js';
import type { FileCollection, FileReferenceItem } from './types.js';

export interface UseFileSearchOptions {
	readonly limit?: number;
	readonly debounceMs?: number;
}

export function useFileSearch(
	collection: FileCollection,
	query: string,
	options: UseFileSearchOptions = {},
): readonly FileReferenceItem[] {
	const limit = options.limit;
	const debounceMs = options.debounceMs ?? 0;
	const debouncedQuery = useDebouncedValue(query, debounceMs);
	const subscribe = useCallback(
		(listener: () => void) => collection.subscribe(listener),
		[collection],
	);
	const getSnapshot = useCallback(
		() => collection.search(debouncedQuery, { limit }),
		[collection, debouncedQuery, limit],
	);

	return useStableExternalStore(subscribe, getSnapshot);
}
