import { ChangeSet, Text } from '@codemirror/state';
import { diffChars } from 'diff';
import type { MarkdownEdit } from '../../../shared/obsidian/markdown/types.js';

export function editMetadataBaseline(
	source: string,
	baseline: string,
	edits: readonly MarkdownEdit[],
): string {
	let position = 0;
	const changes: { from: number; to: number; insert: string }[] = [];
	for (const part of diffChars(source, baseline)) {
		if (part.added)
			changes.push({ from: position, to: position, insert: part.value });
		else {
			if (part.removed)
				changes.push({
					from: position,
					to: position + part.value.length,
					insert: '',
				});
			position += part.value.length;
		}
	}
	// Map only UI-owned edits into the review baseline. Replacing the baseline with
	// the live note would silently accept unrelated agent changes.
	// https://codemirror.net/docs/ref/#state.ChangeSet
	const mapping = ChangeSet.of(changes, source.length);
	const mapped = edits.map(({ from, to, text }) => ({
		from: mapping.mapPos(from, -1),
		to: mapping.mapPos(to, 1),
		insert: text,
	}));
	return ChangeSet.of(mapped, baseline.length)
		.apply(Text.of(baseline.split('\n')))
		.toString();
}
