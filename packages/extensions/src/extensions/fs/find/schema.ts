import { z } from 'zod';

export const findSchema = z.object({
	pattern: z
		.string()
		.describe(
			"Glob pattern to match files, e.g. '*.ts', '**/*.json', or 'src/**/*.spec.ts'",
		),
	path: z
		.string()
		.optional()
		.describe('Directory to search in (default: current directory)'),
	limit: z
		.number()
		.optional()
		.describe('Maximum number of results (default: 1000)'),
});
export type FindInput = z.infer<typeof findSchema>;
