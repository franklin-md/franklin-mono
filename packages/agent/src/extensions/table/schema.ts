import { z } from 'zod';

function validURL(value: string): boolean {
	try {
		const url = new URL(value);
		return (
			['http:', 'https:'].includes(url.protocol) &&
			!url.username &&
			!url.password &&
			!Array.from(value).some((char) => char.charCodeAt(0) <= 32)
		);
	} catch {
		return false;
	}
}
const url = z
	.string()
	.max(4096)
	.refine(validURL, 'Use a public HTTP or HTTPS source URL');
const cell = z.union([
	z.string().max(16_384),
	z.number(),
	z.boolean(),
	z.null(),
]);
export const tableSchema = z
	.object({
		path: z
			.string()
			.min(1)
			.max(1024)
			.refine(
				(path) =>
					!path.includes('\0') &&
					!/^[\\/]|^[a-zA-Z]:|(?:^|[\\/])\.\.(?:[\\/]|$)/.test(path),
				'Use a relative path inside the working directory',
			),
		format: z.enum(['markdown', 'csv']),
		title: z.string().max(1000).optional(),
		description: z.string().max(16_384).optional(),
		columns: z
			.array(
				z.object({
					key: z.string().min(1).max(100),
					label: z.string().min(1).max(200),
					type: z.enum(['text', 'number', 'boolean', 'url']),
				}),
			)
			.min(1)
			.max(30),
		rows: z
			.array(
				z.object({
					cells: z.array(cell).max(30),
					sourceUrls: z.array(url).max(20),
				}),
			)
			.max(200),
		research: z
			.object({
				query: z.string().max(16_384),
				runId: z.string().max(256).optional(),
				partial: z.boolean().optional(),
			})
			.optional(),
		expectedDatasetHash: z
			.string()
			.regex(/^[a-f0-9]{64}$/)
			.optional(),
	})
	.superRefine((table, ctx) => {
		const reserved = new Set(['sources', 'source_urls']);
		for (const field of ['key', 'label'] as const) {
			const names = table.columns.map((column) =>
				column[field].toLowerCase().trim(),
			);
			if (
				new Set(names).size !== names.length ||
				names.some((name) => reserved.has(name))
			)
				ctx.addIssue({
					code: 'custom',
					message:
						'Column keys and labels must be unique; Sources and source_urls are reserved',
				});
		}
		const extension = table.format === 'markdown' ? '.md' : '.csv';
		if (!table.path.toLowerCase().endsWith(extension))
			ctx.addIssue({
				code: 'custom',
				message: `Path must end with ${extension}`,
			});
		for (const row of table.rows) {
			if (row.cells.length !== table.columns.length) {
				ctx.addIssue({
					code: 'custom',
					message: 'Every row must match the column count',
				});
				continue;
			}
			row.cells.forEach((value, i) => {
				const type = table.columns[i]?.type;
				if (value === null) return;
				if (
					(type === 'text' && typeof value !== 'string') ||
					(type === 'number' && typeof value !== 'number') ||
					(type === 'boolean' && typeof value !== 'boolean') ||
					(type === 'url' && (typeof value !== 'string' || !validURL(value)))
				)
					ctx.addIssue({
						code: 'custom',
						message: 'Cell type does not match its column',
					});
			});
		}
	});
