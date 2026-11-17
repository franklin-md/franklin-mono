export function splitLines(text: string): string[] {
	// Retain terminators so changing or removing a newline also changes its line.
	return text.match(/[^\r\n]*(?:\r\n|\r|\n)|[^\r\n]+$/g) ?? [];
}
