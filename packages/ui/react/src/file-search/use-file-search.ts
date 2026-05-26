import { useCallback } from 'react';

import { useStableExternalStore } from '../utils/use-stable-external-store.js';
import type { FileCollection, FileReferenceItem } from './types.js';

export interface UseFileSearchOptions {
	readonly limit?: number;
}

export function useFileSearch(
	collection: FileCollection,
	query: string,
	options: UseFileSearchOptions = {},
): readonly FileReferenceItem[] {
	const limit = options.limit;
	const subscribe = useCallback(
		(listener: () => void) => collection.subscribe(listener),
		[collection],
	);
	const getSnapshot = useCallback(
		() => collection.search(query, { limit }),
		[collection, query, limit],
	);

	return useStableExternalStore(subscribe, getSnapshot);
}
