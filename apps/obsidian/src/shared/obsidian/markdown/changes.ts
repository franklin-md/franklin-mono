import type { MarkdownEdit } from './types.js';

export function validateMarkdownEdits(
	source: string,
	edits: readonly MarkdownEdit[],
): MarkdownEdit[] {
	const sorted = [...edits].sort((left, right) => left.from - right.from);
	let previous: MarkdownEdit | undefined;
	for (const edit of sorted) {
		if (
			!Number.isInteger(edit.from) ||
			!Number.isInteger(edit.to) ||
			edit.from < 0 ||
			edit.to < edit.from ||
			edit.to > source.length
		)
			throw new Error('Invalid Markdown edit range');
		if (previous && (edit.from < previous.to || edit.from === previous.from))
			throw new Error('Overlapping Markdown edit ranges');
		previous = edit;
	}
	return sorted;
}
