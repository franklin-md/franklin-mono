import { z } from 'zod';

export const grepSchema = z.object({
	pattern: z.string().describe('Search pattern (regex or literal string)'),
	path: z
		.string()
		.optional()
		.describe('Directory or file to search (default: current directory)'),
	glob: z
		.string()
		.optional()
		.describe("Filter files by glob pattern, e.g. '*.ts' or '**/*.spec.ts'"),
	ignoreCase: z
		.boolean()
		.optional()
		.describe('Case-insensitive search (default: false)'),
	literal: z
		.boolean()
		.optional()
		.describe(
			'Treat pattern as literal string instead of regex (default: false)',
		),
	context: z
		.number()
		.optional()
		.describe(
			'Number of lines to show before and after each match (default: 0)',
		),
	limit: z
		.number()
		.optional()
		.describe('Maximum number of matches to return (default: 100)'),
});
export type GrepInput = z.infer<typeof grepSchema>;
