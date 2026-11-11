import type { TableInput } from './types.js';

function text(value: string): string {
	const escaped: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'|': '&#124;',
		'[': '&#91;',
		']': '&#93;',
		'\\': '&#92;',
		'`': '&#96;',
		'*': '&#42;',
		_: '&#95;',
	};
	return value
		.replace(/[&<>|[\]\\`*_]/g, (char) => escaped[char] ?? char)
		.replace(/\r\n|\r|\n/g, '<br>');
}
function link(url: string, label: string): string {
	return `[${label}](<${url.replaceAll('<', '%3C').replaceAll('>', '%3E').replaceAll('\\', '%5C')}>)`;
}

export function markdownTable(table: TableInput, exportedAt: Date): string {
	const lines = [
		`# ${text(table.title ?? 'Research results')}`,
		'',
		`Exported at: ${exportedAt.toISOString()}`,
		'',
	];
	if (table.description) lines.push(text(table.description), '');
	if (table.research) {
		lines.push(`Research request: ${text(table.research.query)}`, '');
		if (table.research.runId)
			lines.push(`Exa run ID: ${text(table.research.runId)}`, '');
		if (table.research.partial)
			lines.push('Partial results: research is incomplete.', '');
	}
	lines.push(
		`| ${[...table.columns.map((column) => text(column.label)), 'Sources'].join(' | ')} |`,
	);
	lines.push(`| ${[...table.columns.map(() => '---'), '---'].join(' | ')} |`);
	for (const row of table.rows) {
		const cells = row.cells.map((value, i) =>
			value === null
				? ''
				: table.columns[i]?.type === 'url'
					? link(String(value), text(String(value)))
					: text(String(value)),
		);
		lines.push(
			`| ${[...cells, row.sourceUrls.map((url, i) => link(url, String(i + 1))).join(' ')].join(' | ')} |`,
		);
	}
	lines.push(
		'',
		'Blank cells indicate unknown values. Sources are supplied research evidence.',
		'',
	);
	return lines.join('\n');
}
