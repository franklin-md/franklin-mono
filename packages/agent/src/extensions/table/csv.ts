import type { TableInput } from './types.js';

// eslint-disable-next-line no-control-regex -- ASCII controls can conceal spreadsheet formula prefixes.
const formulaPrefix = /^[\s\u0000-\u001f]*[=+@-]/;

export function csvTable(table: TableInput): {
	content: string;
	protectedCells: number;
} {
	let protectedCells = 0;
	function cell(value: string | number | boolean | null): string {
		let text = value === null ? '' : String(value);
		// Quoting alone does not stop spreadsheets interpreting untrusted text as a formula.
		// Preserve typed numbers (including negatives); protection applies to text and headers.
		// https://owasp.org/www-community/attacks/CSV_Injection
		if (typeof value === 'string' && formulaPrefix.test(text)) {
			text = "'" + text;
			protectedCells++;
		}
		return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
	}
	const rows = [
		[...table.columns.map((column) => column.label), 'source_urls'],
		...table.rows.map((row) => [...row.cells, row.sourceUrls.join('\n')]),
	];
	return {
		content: rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n',
		protectedCells,
	};
}
