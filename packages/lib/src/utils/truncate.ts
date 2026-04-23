export type TruncateResult = { text: string; truncated: boolean };

export function truncate(
	text: string,
	maxLength: number,
	suffix = '...',
): TruncateResult {
	if (text.length <= maxLength) return { text, truncated: false };
	return { text: sliceWithSuffix(text, maxLength, suffix), truncated: true };
}

export interface TruncateStreamOptions {
	maxLength: number;
	separator?: string;
	suffix?: string;
}

// Forward-only, atomic-block truncation: joins `chunks` with `separator`,
// stopping before the first chunk that would overflow `maxLength`. Reserves
// space for `suffix` (+ joining separator) up front so the suffix always fits
// when truncation occurs. The iterable is not consumed past the first
// overflow, so generators with side effects see an early exit.
export function truncateStream(
	chunks: Iterable<string>,
	options: TruncateStreamOptions,
): TruncateResult {
	const { maxLength, separator = '', suffix = '' } = options;
	const suffixReservation =
		suffix.length === 0 ? 0 : suffix.length + separator.length;
	const contentBudget = Math.max(0, maxLength - suffixReservation);

	const accepted: string[] = [];
	let used = 0;

	for (const chunk of chunks) {
		const next = used + chunk.length + (accepted.length > 0 ? separator.length : 0);
		if (next > contentBudget) {
			return {
				text: joinThenAppend(accepted, separator, suffix, maxLength),
				truncated: true,
			};
		}
		accepted.push(chunk);
		used = next;
	}
	return { text: accepted.join(separator), truncated: false };
}

function sliceWithSuffix(
	text: string,
	maxLength: number,
	suffix: string,
): string {
	if (maxLength <= suffix.length) return suffix.slice(0, maxLength);
	return text.slice(0, maxLength - suffix.length).trimEnd() + suffix;
}

function joinThenAppend(
	chunks: readonly string[],
	separator: string,
	suffix: string,
	maxLength: number,
): string {
	if (chunks.length === 0) return suffix.slice(0, maxLength);
	if (suffix.length === 0) return chunks.join(separator);
	return chunks.join(separator) + separator + suffix;
}
