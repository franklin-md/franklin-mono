export function selectionQuestion(quote: string): string {
	const text = quote.trim();
	// Keep multi-line study passages intact; a single task should read as a question.
	return text.includes('\n')
		? text
		: text.replace(/^(?:(?:[-+*]|\d+[.)])\s+)?\[[ xX-]\]\s*/, '').trim();
}
