export type TruncateResult = { text: string; truncated: boolean };

export function truncate(
	text: string,
	maxLength: number,
	suffix = '...',
): TruncateResult {
	if (text.length <= maxLength) return { text, truncated: false };
	if (maxLength <= suffix.length) {
		return { text: suffix.slice(0, maxLength), truncated: true };
	}
	return {
		text: text.slice(0, maxLength - suffix.length).trimEnd() + suffix,
		truncated: true,
	};
}
