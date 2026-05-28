import { useFileCollection, useFileSearch } from '@franklin/react';

import type { MentionSuggestionState } from './menu-controller.js';

const MENTION_LIMIT = 8;

export function useMentionItems(suggestion: MentionSuggestionState) {
	const collection = useFileCollection();
	const query = suggestion.active ? suggestion.query : '';

	return useFileSearch(collection, query, {
		limit: MENTION_LIMIT,
		debounceMs: 50,
	});
}
