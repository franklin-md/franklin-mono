import type { DatabaseSync } from 'node:sqlite';
import type * as SQLite from 'node:sqlite';
import { getBuiltinModule } from 'node:process';

export function readMochiDatabase<T>(
	path: string,
	read: (database: DatabaseSync) => T,
): T {
	const sqlite = getBuiltinModule('node:sqlite') as typeof SQLite | undefined;
	if (!sqlite)
		throw new Error(
			'Mochi capture needs an Obsidian desktop runtime with node:sqlite (verified on Electron 39 / Node 22.22).',
		);
	const database = new sqlite.DatabaseSync(path, { readOnly: true });
	try {
		// Use Electron's binding and a consistent view of committed WAL data. Never
		// copy DB/WAL/SHM separately or use immutable=1 on Mochi's live database.
		// https://sqlite.org/wal.html#read_only_databases
		database.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=500; BEGIN;');
		const result = read(database);
		database.exec('COMMIT;');
		return result;
	} catch (error) {
		throw new Error(
			'Could not read the local Mochi database. Check its path, schema and availability, then retry.',
			{ cause: error },
		);
	} finally {
		database.close();
	}
}
