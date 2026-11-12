import { z } from 'zod';
import { decodeTransit } from './decode.js';
import { readMochiDatabase } from './database.js';

export async function readMochiDraftIds(path: string): Promise<string[]> {
	return readMochiDatabase(path, (database) => {
		// Mochi's save-and-new flow creates an empty card before the user authors
		// it. Remember only unsaved drafts, so older published-card edits never
		// become candidates merely because updated-at falls in the window.
		const rows = database
			.prepare(
				`SELECT json_extract(b.json, '$."transit-data"."~:id"') AS id
				FROM "document-store" d JOIN "by-sequence" b ON d.winningseq = b.seq
				WHERE b.deleted = 0 AND json_extract(b.json, '$.type') = 'card'
				AND json_extract(b.json, '$."transit-data"."~:new?"') = 1
				AND json_extract(b.json, '$."transit-data"."~:trashed?"') IS NOT 1
				ORDER BY d.id LIMIT 1001`,
			)
			.all();
		if (rows.length > 1000)
			throw new Error(
				'More than 1000 open Mochi drafts; recording was not started.',
			);
		const ids = rows.map((row) =>
			z
				.string()
				.min(1)
				.parse(decodeTransit(z.string().parse(row.id))),
		);
		if (new Set(ids).size !== ids.length)
			throw new Error(
				'Duplicate Mochi draft IDs; unsupported database format.',
			);
		return ids;
	});
}
