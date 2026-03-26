export type LineEnding = '\r\n' | '\n';

/**
 * Detect the dominant line ending in a string.
 *
 * Returns CRLF if the first newline-like sequence is `\r\n`,
 * otherwise LF (also the default for files with no newlines).
 */
export function detectLineEnding(text: string): LineEnding {
	const crlfIdx = text.indexOf('\r\n');
	const lfIdx = text.indexOf('\n');
	if (lfIdx === -1) return '\n';
	if (crlfIdx === -1) return '\n';
	return crlfIdx < lfIdx ? '\r\n' : '\n';
}

/**
 * Normalize all line endings to LF.
 */
export function normalizeToLF(text: string): string {
	return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Restore line endings from LF-normalized text to the original format.
 */
export function restoreLineEndings(text: string, ending: LineEnding): string {
	if (ending === '\r\n') return text.replace(/\n/g, '\r\n');
	return text;
}
