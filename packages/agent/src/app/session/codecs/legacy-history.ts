import { z } from 'zod';
import type { Message } from '@franklin/mini-acp';
import type { SessionEntry } from '../../../modules/core/history/types.js';

const LegacyEntries = z.array(
	z.discriminatedUnion('type', [
		z.object({
			type: z.literal('message'),
			id: z.string().min(1),
			message: z.custom<Message>(),
		}),
		z.object({
			type: z.literal('compaction'),
			id: z.string().min(1),
			summary: z.string(),
			firstKeptEntryId: z.string().min(1).nullable(),
		}),
	]),
);

export function migrateLegacyHistory(raw: unknown): unknown {
	if (
		!Array.isArray(raw) ||
		!raw.some(
			(entry: unknown) =>
				typeof entry === 'object' &&
				entry !== null &&
				('id' in entry || 'firstKeptEntryId' in entry),
		)
	)
		return raw;

	const entries = LegacyEntries.parse(raw);
	const ids = new Set<string>();
	let visible: Array<{ id: string; message: Message }> = [];
	const migrated: SessionEntry[] = [];
	for (const entry of entries) {
		if (ids.has(entry.id)) throw new Error('Duplicate legacy session entry ID');
		ids.add(entry.id);
		if (entry.type === 'message') {
			visible.push(entry);
			migrated.push({ type: 'message', message: entry.message });
			continue;
		}
		const boundary =
			entry.firstKeptEntryId === null
				? visible.length
				: visible.findIndex((item) => item.id === entry.firstKeptEntryId);
		if (boundary < 0) throw new Error('Invalid legacy compaction boundary');
		visible = visible.slice(boundary);
		// The personal branch and upstream both wrote v3. Upstream checkpoints
		// replace the full prefix, so replay the legacy retained tail after each
		// checkpoint. Original messages/checkpoints stay in the log; only decoding
		// understands IDs. Normalized files and the runtime use upstream entries.
		// https://github.com/franklin-md/franklin-mono/pull/300
		migrated.push(
			{ type: 'compaction', summary: entry.summary },
			...visible.map(({ message }) => ({ type: 'message' as const, message })),
		);
	}
	return migrated;
}
