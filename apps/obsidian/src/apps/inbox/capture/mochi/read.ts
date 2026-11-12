import { z } from 'zod';
import { Buffer } from 'node:buffer';
import { decodeTransit } from './decode.js';
import { readMochiDatabase } from './database.js';
import { CAPTURE_VERSION } from '../version.js';
import type { CapturedCard, MochiSnapshot } from './types.js';

const document = z.object({
	type: z.string(),
	'transit-data': z.record(z.string(), z.json()),
});
const dataSchema = z.object({
	id: z.string().min(1),
	'created-at': z.number().int().nonnegative(),
	'updated-at': z.number().int().nonnegative().nullish(),
	'new?': z.boolean().nullish(),
	'deck-id': z
		.string()
		.nullish()
		.transform((value) => value ?? undefined),
	'template-id': z
		.string()
		.nullish()
		.transform((value) => value ?? undefined),
	content: z
		.string()
		.nullish()
		.transform((value) => value ?? ''),
	fields: z
		.record(z.string(), z.json())
		.nullish()
		.transform((value) => value ?? {}),
	'trashed?': z.boolean().nullish(),
});
const timestamp = '$."transit-data"."~:created-at"."~#dt"';
const live =
	'FROM "document-store" d JOIN "by-sequence" b ON d.winningseq = b.seq WHERE b.deleted = 0';

export async function readMochiCards(
	path: string,
	startMs: number,
	endMs: number,
	draftCardIds: string[] = [],
): Promise<MochiSnapshot> {
	if (
		!Number.isSafeInteger(startMs) ||
		!Number.isSafeInteger(endMs) ||
		startMs < 0 ||
		endMs < startMs
	)
		throw new Error(
			'Invalid recording window. The clock may have moved backwards.',
		);
	const snapshotStartedAt = Date.now();
	return readMochiDatabase(path, (database) => {
		const invalid = database
			.prepare(
				`SELECT count(*) AS count ${live}
			AND json_extract(b.json, '$.type') = 'card'
			AND (json_type(b.json, ?) IS NOT 'integer' OR json_extract(b.json, ?) < 0)`,
			)
			.get(timestamp, timestamp);
		if (invalid?.count !== 0)
			throw new Error(
				'Unsupported Mochi card creation timestamps; capture was not collected.',
			);
		const rows = database
			.prepare(
				`SELECT b.json, b.rev ${live}
			AND json_extract(b.json, '$.type') = 'card'
			AND ((json_extract(b.json, ?) >= ? AND json_extract(b.json, ?) < ?)
			OR d.id IN (SELECT value FROM json_each(?)))
			ORDER BY json_extract(b.json, ?), d.id LIMIT 1001`,
			)
			.all(
				timestamp,
				startMs,
				timestamp,
				endMs,
				JSON.stringify(draftCardIds),
				timestamp,
			);
		if (rows.length > 1000)
			throw new Error(
				'More than 1000 candidate cards; capture was not collected.',
			);
		const related =
			database.prepare(`SELECT b.json ${live} AND json_extract(b.json, '$.type') = ?
			AND json_extract(b.json, '$."transit-data"."~:id"') IN (?, ?)`);
		const loadRelated = (
			type: string,
			id: string | undefined,
		): CapturedCard['deck'] => {
			if (!id) return undefined;
			const row = related.get(type, id, `~:${id}`);
			if (!row) return undefined;
			const raw = document.parse(JSON.parse(z.string().parse(row.json)));
			return z
				.record(z.string(), z.json())
				.parse(decodeTransit(raw['transit-data']));
		};
		const cards: CapturedCard[] = [];
		const drafts = new Set(draftCardIds);
		let bytes = 0;
		for (const row of rows) {
			const json = z.string().parse(row.json);
			bytes += Buffer.byteLength(json, 'utf8');
			if (bytes > 16_000_000)
				throw new Error(
					'Candidate card data exceeds 16 MB; capture was not collected.',
				);
			const raw = document.parse(JSON.parse(json));
			const decoded = z
				.record(z.string(), z.json())
				.parse(decodeTransit(raw['transit-data']));
			const data = dataSchema.parse(decoded);
			if (data['trashed?'] || data['new?']) continue;
			const createdInWindow =
				data['created-at'] >= startMs && data['created-at'] < endMs;
			const updatedAt = data['updated-at'] ?? undefined;
			if (drafts.has(data.id) && updatedAt === undefined)
				throw new Error(
					'Saved Mochi draft has no update timestamp; capture was not collected.',
				);
			const draftSavedInWindow =
				drafts.has(data.id) &&
				updatedAt !== undefined &&
				updatedAt >= startMs &&
				updatedAt < endMs;
			if (!createdInWindow && !draftSavedInWindow) continue;
			const deck = loadRelated('deck', data['deck-id']);
			const template = loadRelated('template', data['template-id']);
			const missing: string[] = [];
			if (data['deck-id'] && !deck) missing.push('Deck document unavailable');
			if (data['template-id'] && !template)
				missing.push('Template document unavailable');
			const attachments = decoded.attachments ?? [];
			// Keep the full decoded body, including inline attachment references.
			// Binary assets are not part of this MVP and must not appear captured.
			cards.push({
				id: data.id,
				createdAt: data['created-at'],
				updatedAt,
				matchedBy: createdInWindow
					? 'created-in-window'
					: 'draft-saved-in-window',
				deckId: data['deck-id'],
				deck,
				content: data.content,
				fields: data.fields,
				templateId: data['template-id'],
				template,
				attachments: { references: attachments, assets: 'not-copied' },
				missing,
				revision: z.string().parse(row.rev),
				raw: decoded,
			});
		}
		if (new Set(cards.map((card) => card.id)).size !== cards.length)
			throw new Error('Duplicate Mochi card IDs; unsupported database format.');
		return {
			source: path,
			captureVersion: CAPTURE_VERSION,
			snapshotStartedAt,
			snapshotAt: Date.now(),
			cards,
		};
	});
}
