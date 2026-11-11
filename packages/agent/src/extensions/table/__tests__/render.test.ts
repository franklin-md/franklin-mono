import { describe, expect, it } from 'vitest';
import { renderTable } from '../render.js';

const table = {
	path: 'Research/companies.md',
	format: 'markdown' as const,
	title: 'Companies',
	columns: [
		{ key: 'name', label: 'Company', type: 'text' as const },
		{ key: 'value', label: 'Value', type: 'number' as const },
	],
	rows: [
		{
			cells: ['A | [[note]] <script>\nnext', -2],
			sourceUrls: ['https://example.com/a?q=1'],
		},
	],
};

describe('table artifacts', () => {
	it('escapes Markdown cells, preserves sources and labels export time', () => {
		const result = renderTable(table, new Date('2026-11-08T12:00:00Z'));
		expect(result.content).toContain('Exported at: 2026-11-08T12:00:00.000Z');
		expect(result.content).toContain(
			'A &#124; &#91;&#91;note&#93;&#93; &lt;script&gt;<br>next',
		);
		expect(result.content).toContain('[1](<https://example.com/a?q=1>)');
		expect(result.content).not.toContain('<script>');
	});
	it('creates quoted CSV and protects string formulas while preserving negative numbers', () => {
		const result = renderTable({
			...table,
			path: 'companies.csv',
			format: 'csv',
			columns: [
				{ key: 'name', label: '=name', type: 'text' },
				table.columns[1]!,
			],
			rows: [
				{
					cells: ['\t=SUM(1,2)', -2],
					sourceUrls: ['https://a.test', 'https://b.test'],
				},
			],
		});
		expect(result.content).toContain("'=name,Value,source_urls\r\n");
		expect(result.content).toContain(
			'"\'\t=SUM(1,2)",-2,"https://a.test\nhttps://b.test"',
		);
		expect(result.warnings.some((w) => w.includes('formula'))).toBe(true);
	});
	it('uses one dataset hash across formats and rejects a changed companion dataset', () => {
		const markdown = renderTable(table);
		const csv = renderTable({
			...table,
			path: 'companies.csv',
			format: 'csv',
			expectedDatasetHash: markdown.datasetHash,
		});
		expect(csv.datasetHash).toBe(markdown.datasetHash);
		expect(() =>
			renderTable({
				...table,
				rows: [],
				expectedDatasetHash: markdown.datasetHash,
			}),
		).toThrow('dataset');
	});
	it('rejects malformed rows, type mismatches, reserved headers, unsafe URLs and paths before rendering', () => {
		expect(() =>
			renderTable({
				...table,
				rows: [{ cells: ['only one'], sourceUrls: [] }],
			}),
		).toThrow();
		expect(() =>
			renderTable({
				...table,
				rows: [{ cells: ['name', 'two'], sourceUrls: [] }],
			}),
		).toThrow();
		expect(() =>
			renderTable({
				...table,
				columns: [{ key: 'Sources', label: 'Sources', type: 'text' }],
			}),
		).toThrow();
		expect(() =>
			renderTable({
				...table,
				rows: [{ cells: ['name', 2], sourceUrls: ['javascript:alert(1)'] }],
			}),
		).toThrow();
		expect(() => renderTable({ ...table, path: '../escape.md' })).toThrow();
	});
});
