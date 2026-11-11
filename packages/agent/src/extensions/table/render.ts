import { encode } from '@franklin/lib';
import { sha256Hex } from '../filesystem/hash.js';
import { tableSchema } from './schema.js';
import { markdownTable } from './markdown.js';
import { csvTable } from './csv.js';

export function renderTable(input: unknown, exportedAt = new Date()) {
	const table = tableSchema.parse(input);
	const datasetHash = sha256Hex(
		encode(
			JSON.stringify([
				table.columns.map((column) => [column.key, column.label, column.type]),
				table.rows.map((row) => [row.cells, row.sourceUrls]),
			]),
		),
	);
	if (table.expectedDatasetHash && table.expectedDatasetHash !== datasetHash)
		throw new Error(
			'Companion dataset differs from the primary export. Reuse the exact columns, rows and sources.',
		);
	const csv = table.format === 'csv' ? csvTable(table) : undefined;
	const content = csv?.content ?? markdownTable(table, exportedAt);
	const bytes = encode(content).byteLength;
	if (bytes > 2 * 1024 * 1024)
		throw new Error('Table exceeds 2 MiB. Export fewer rows or smaller cells.');
	const warnings: string[] = [];
	const unsourced = table.rows.filter(
		(row) => row.sourceUrls.length === 0,
	).length;
	if (unsourced)
		warnings.push(`${unsourced} rows have no supplied source URLs.`);
	if (csv?.protectedCells)
		warnings.push(
			`${csv.protectedCells} text cells or headers were protected against spreadsheet formulas.`,
		);
	if (table.research?.partial)
		warnings.push('Research is incomplete; this is a partial export.');
	return { table, content, bytes, datasetHash, warnings };
}
