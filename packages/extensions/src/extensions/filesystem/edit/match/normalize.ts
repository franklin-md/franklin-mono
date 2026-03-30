/**
 * Normalize text for fuzzy matching against LLM output.
 *
 * LLMs often produce subtly different characters than what's in the file:
 * smart quotes instead of ASCII, trailing whitespace differences,
 * Unicode dashes, etc. This normalizes both sides so matching
 * can succeed despite these cosmetic differences.
 */
export function normalizeForFuzzyMatch(text: string): string {
	return (
		text
			// Unicode canonical decomposition → composition
			.normalize('NFKC')
			// Strip trailing whitespace per line
			.split('\n')
			.map((line) => line.trimEnd())
			.join('\n')
			// Smart single quotes → '
			.replace(/[\u2018\u2019\u201A\u201B]/g, "'")
			// Smart double quotes → "
			.replace(/[\u201C\u201D\u201E\u201F]/g, '"')
			// Unicode dashes/hyphens → -
			.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
			// Special Unicode spaces → regular space
			.replace(/[\u00A0\u2002-\u200A\u202F\u205F\u3000]/g, ' ')
	);
}
