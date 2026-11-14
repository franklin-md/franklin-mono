import type { MessageEntry } from './types.js';

export function validateBoundary(
	entries: readonly MessageEntry[],
	start: number,
): void {
	const pending = new Set<string>();
	for (const entry of entries.slice(0, start)) {
		const message = entry.message;
		if (message.role === 'assistant') {
			for (const block of message.content) {
				if (block.type === 'toolCall') pending.add(block.id);
			}
		} else if (message.role === 'toolResult') {
			pending.delete(message.toolCallId);
		}
	}
	// A fence cannot summarize a call while leaving its result in the suffix,
	// including a boundary between parallel calls and their remaining results.
	if (pending.size > 0 || entries[start]?.message.role === 'toolResult') {
		throw new Error('Invalid compaction boundary: split tool exchange');
	}
}
