import { Decoration } from '@codemirror/view';
import type { Range, Text } from '@codemirror/state';
import type { Hunk } from '../../compute-hunks.js';

export function addedLineDecorations(
	doc: Text,
	hunk: Hunk,
): Range<Decoration>[] {
	if (hunk.addedLines.length === 0) return [];

	const addedEnd = Math.min(hunk.newTo, doc.length);
	if (hunk.newFrom >= addedEnd) return [];

	const decorations: Range<Decoration>[] = [];
	let cursor = hunk.newFrom;
	let lineNo = 0;
	const totalLines = countAddedLines(doc, hunk.newFrom, addedEnd);

	while (cursor < addedEnd) {
		const line = doc.lineAt(cursor);
		const isFirst = lineNo === 0;
		const isLast = lineNo === totalLines - 1;
		const classes = [
			'diff-plugin-added-line',
			isFirst ? 'diff-plugin-added-first' : '',
			isLast ? 'diff-plugin-added-last' : '',
		]
			.filter(Boolean)
			.join(' ');

		decorations.push(
			Decoration.line({
				class: classes,
				attributes: {
					'data-diff-hunk-id': hunk.id,
				},
			}).range(line.from),
		);

		if (line.to >= addedEnd - 1) break;
		cursor = line.to + 1;
		lineNo++;
	}

	return decorations;
}

function countAddedLines(doc: Text, from: number, to: number): number {
	if (from >= to) return 0;
	const start = doc.lineAt(from).number;
	const end = doc.lineAt(Math.min(to - 1, doc.length)).number;
	return end - start + 1;
}
