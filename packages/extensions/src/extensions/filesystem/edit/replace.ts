/**
 * Apply a text replacement at a known position.
 *
 * Pure function — takes the content string, match position, and
 * new text, returns the result. No IO, no side effects.
 */
export function applyReplacement(
	content: string,
	index: number,
	length: number,
	newText: string,
): string {
	return (
		content.substring(0, index) + newText + content.substring(index + length)
	);
}
