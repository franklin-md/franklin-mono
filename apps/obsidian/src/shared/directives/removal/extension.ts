import type { Extension, Text, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { countDirectives } from '../reading/count.js';
import type { DirectiveRegistry } from '../registry.js';
import { formatDirective } from '../syntax/format.js';
import { parseDirectives } from '../syntax/parse.js';
import { scanDirectives } from '../syntax/scan.js';
import type { DirectiveReference, DirectiveToken } from '../syntax/types.js';

export function createDirectiveRemovalExtension(
	registry: DirectiveRegistry,
): Extension {
	// Listeners run after the update finishes, so consumers may edit the editor.
	return EditorView.updateListener.of((update) => {
		for (const transaction of update.transactions)
			for (const { name, id } of removedDirectives(transaction))
				registry.reportRemoved(name, id);
	});
}

function removedDirectives(transaction: Transaction): DirectiveReference[] {
	// Typing, deletion and paste remove references on purpose. Undo, redo, a
	// pane switching notes, agent rewrites and Franklin's own reference cleanup
	// also drop tokens, but the user did not delete them. Cut usually moves a
	// reference, so it is ignored rather than deleting what the paste restores.
	if (
		!transaction.docChanged ||
		!(transaction.isUserEvent('input') || transaction.isUserEvent('delete')) ||
		transaction.isUserEvent('delete.cut')
	)
		return [];
	// Only whole tokens count. Editing inside one (Source mode) leaves broken
	// text that undo repairs. Whole tokens lie within the replaced and inserted
	// text, so each keystroke scans only that text.
	const deleted = new Set<number>();
	const inserted = new Set<number>();
	transaction.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
		collectTokens(transaction.startState.doc, fromA, toA, deleted);
		collectTokens(transaction.state.doc, fromB, toB, inserted);
	});
	if (deleted.size === 0) return [];
	// Parsing Markdown costs the whole note, so it waits until a token is gone.
	// It drops code examples and escaped tokens, which are not references.
	const restored = countDirectives(references(transaction.state.doc, inserted));
	const removed = new Map<string, DirectiveReference>();
	for (const { name, id } of references(transaction.startState.doc, deleted)) {
		// Pasting or retyping the same token restores that reference.
		const key = formatDirective(name, id);
		const left = restored.get(key) ?? 0;
		if (left > 0) restored.set(key, left - 1);
		else removed.set(key, { name, id });
	}
	return [...removed.values()];
}

function collectTokens(
	doc: Text,
	from: number,
	to: number,
	starts: Set<number>,
): void {
	for (const token of scanDirectives(doc.sliceString(from, to)))
		starts.add(from + token.from);
}

function references(doc: Text, starts: Set<number>): DirectiveToken[] {
	if (starts.size === 0) return [];
	return parseDirectives(doc.toString()).filter(({ from }) => starts.has(from));
}
