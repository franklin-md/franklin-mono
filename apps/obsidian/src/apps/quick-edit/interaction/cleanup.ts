import { countColumn } from '@codemirror/state';
import { parser } from '@lezer/markdown';
import { findDirectiveRanges } from '../../../shared/directives/scribe/find.js';
import type { DirectiveReference } from '../../../shared/directives/syntax/types.js';
import type { MarkdownEdit } from '../../../shared/obsidian/markdown/types.js';
import { findQuickEditDraft } from './draft/find.js';

export function quickEditCleanup(
	source: string,
	reference: DirectiveReference,
): MarkdownEdit[] {
	const matches = findDirectiveRanges(source, reference);
	if (matches.length > 1)
		throw new Error('Expected exactly one quick edit in its original note');
	const token = matches[0];
	if (!token) return [];
	const end = findQuickEditDraft(source, reference.id)?.to ?? token.to;
	const from = source.lastIndexOf('\n', token.from - 1) + 1;
	const newline = source.indexOf('\n', end);
	const to = newline < 0 ? source.length : newline;
	const prefix = source.slice(from, token.from);
	const list = /^([\t ]*)((?:[-+*]|\d+[.)])[\t ]+)(?:\[[ xX-]\][\t ]+)?$/.exec(
		prefix,
	);
	if ((!list && prefix.trim()) || source.slice(end, to).trim())
		return [{ from: token.from, to: end, text: '' }];

	const edits: MarkdownEdit[] = [
		{
			from:
				newline < 0 && from > 0
					? from - (source[from - 2] === '\r' ? 2 : 1)
					: from,
			to: newline < 0 ? to : to + 1,
			text: '',
		},
	];
	if (!list) return edits;
	let item = parser.parse(source).resolveInner(token.from, 1);
	while (item.parent && item.name !== 'ListItem') item = item.parent;
	if (item.name !== 'ListItem') return edits;
	const indent = list[1] ?? '';
	const contentColumn = countColumn(indent + (list[2] ?? ''), 4);
	const removedColumns = contentColumn - countColumn(indent, 4);
	// Remove only this empty list container, promoting its remaining content one
	// level. The Markdown tree bounds the item, so siblings and later code blocks
	// keep their indentation. Tabs use Markdown's four-column indentation.
	// https://spec.commonmark.org/0.31.2/#list-items
	for (let line = to + 1; line < item.to; ) {
		const whitespace = /^[\t ]*/.exec(source.slice(line))?.[0] ?? '';
		const columns = countColumn(whitespace, 4);
		if (columns >= contentColumn) {
			const target = columns - removedColumns;
			let keep = whitespace.length;
			while (countColumn(whitespace, 4, keep) > target) keep--;
			const kept = whitespace.slice(0, keep);
			edits.push({
				from: line,
				to: line + whitespace.length,
				text: kept + ' '.repeat(target - countColumn(kept, 4)),
			});
		}
		const next = source.indexOf('\n', line);
		if (next < 0) break;
		line = next + 1;
	}
	return edits;
}
