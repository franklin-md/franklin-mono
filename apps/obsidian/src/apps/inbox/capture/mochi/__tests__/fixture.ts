export async function createMochiFixture(path: string) {
	const { DatabaseSync } = await import('node:sqlite');
	const database = new DatabaseSync(path);
	database.exec(`PRAGMA journal_mode=WAL;
		CREATE TABLE "document-store" (id TEXT PRIMARY KEY, winningseq INTEGER);
		CREATE TABLE "by-sequence" (seq INTEGER PRIMARY KEY AUTOINCREMENT, json TEXT, deleted INTEGER, doc_id TEXT, rev TEXT);`);
	const insert = database.prepare(
		'INSERT INTO "by-sequence" (json, deleted, doc_id, rev) VALUES (?, ?, ?, ?)',
	);
	const winner = database.prepare(
		'INSERT INTO "document-store" VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET winningseq=excluded.winningseq',
	);
	return {
		database,
		put(
			id: string,
			fields: Record<string, unknown>,
			options: { type?: string; deleted?: boolean; winning?: boolean } = {},
		) {
			const row = insert.run(
				JSON.stringify({
					type: options.type ?? 'card',
					'transit-data': { '~:id': id, ...fields },
				}),
				options.deleted ? 1 : 0,
				id,
				`revision-${crypto.randomUUID()}`,
			);
			if (options.winning !== false) winner.run(id, row.lastInsertRowid);
		},
	};
}
