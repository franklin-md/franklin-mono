import type { MatchResult } from './types.js';
import { normalizeForFuzzyMatch } from './normalize.js';

/**
 * Find a unique occurrence of `search` within `content`.
 *
 * Tries exact `indexOf` first. If that fails, falls back to
 * fuzzy matching (normalized trailing whitespace, smart quotes, etc.).
 *
 * Returns `found: false` if:
 * - The text doesn't appear at all
 * - The text matches more than once (`ambiguous: true`)
 */
export function findUnique(content: string, search: string): MatchResult {
	// --- Exact match ---
	const exactIdx = content.indexOf(search);
	if (exactIdx !== -1) {
		// Check uniqueness: search for a second occurrence
		const secondIdx = content.indexOf(search, exactIdx + 1);
		if (secondIdx !== -1) {
			return { found: false, ambiguous: true };
		}
		return {
			found: true,
			index: exactIdx,
			length: search.length,
			fuzzy: false,
			content,
		};
	}

	// --- Fuzzy match ---
	const fuzzyContent = normalizeForFuzzyMatch(content);
	const fuzzySearch = normalizeForFuzzyMatch(search);
	const fuzzyIdx = fuzzyContent.indexOf(fuzzySearch);

	if (fuzzyIdx === -1) {
		return { found: false, ambiguous: false };
	}

	// Check uniqueness in normalized space
	const secondFuzzyIdx = fuzzyContent.indexOf(fuzzySearch, fuzzyIdx + 1);
	if (secondFuzzyIdx !== -1) {
		return { found: false, ambiguous: true };
	}

	return {
		found: true,
		index: fuzzyIdx,
		length: fuzzySearch.length,
		fuzzy: true,
		content: fuzzyContent,
	};
}
