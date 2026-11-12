import type { Message } from '@franklin/mini-acp';
import { estimateMessageTokens } from '@franklin/mini-acp/session';
import type { MessageEntry } from '../history/types.js';

export function prepareCompaction(
	entries: readonly MessageEntry[],
	keepRecentTokens: number,
):
	| {
			readonly firstKeptEntryId: string;
			readonly messages: Message[];
	  }
	| undefined {
	let tokens = 0;
	let desired = entries.length;
	while (desired > 0) {
		const entry = entries[desired - 1];
		if (!entry) break;
		const next = estimateMessageTokens(entry.message);
		if (desired < entries.length && tokens + next > keepRecentTokens) break;
		tokens += next;
		desired -= 1;
	}
	// Always keep the latest exchange, even when the requested budget is zero.
	desired = Math.min(desired, entries.length - 1);
	const pending = new Set<string>();
	let cut = 0;
	for (const [index, entry] of entries.entries()) {
		if (index > desired) break;
		const message = entry.message;
		if (pending.size === 0 && message.role !== 'toolResult') cut = index;
		if (message.role === 'assistant') {
			for (const block of message.content) {
				if (block.type === 'toolCall') pending.add(block.id);
			}
		} else if (message.role === 'toolResult') {
			pending.delete(message.toolCallId);
		}
	}
	const firstKept = entries[cut];
	if (cut === 0 || !firstKept) return undefined;
	return {
		firstKeptEntryId: firstKept.id,
		messages: entries.slice(0, cut).map((entry) => entry.message),
	};
}
