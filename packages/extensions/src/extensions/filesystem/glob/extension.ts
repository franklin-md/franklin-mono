import { z } from 'zod';
import type { Extension } from '../../../types/extension.js';
import type { CoreAPI } from '../../../api/core/api.js';
import type { EnvironmentAPI } from '../../../api/environment/api.js';

const schema = z.object({
	pattern: z
		.string()
		.or(z.array(z.string()))
		.describe(
			'The glob pattern (or list of patterns) to match files against (REQUIRED).',
		),
	options: z.object({
		root_dir: z
			.string()
			.optional()
			.describe(
				'The directory to search in. (OPTIONAL, defaults to current working directory)',
			),
		exclude: z
			.array(z.string())
			.optional()
			.describe(
				"One pattern or a list of glob patterns to be excluded. If a string array is provided, each string should be a glob pattern that specifies paths to exclude. Note: Negation patterns (e.g., '!foo.js') are not supported.",
			),
		limit: z
			.number()
			.optional()
			.describe(
				'How many results to return. If specified, the tool will return only the first `limit` results.',
			),
	}),
});

type GlobInput = z.infer<typeof schema>;

export function globExtension(): Extension<CoreAPI & EnvironmentAPI> {
	return (api) => {
		const env = api.getEnvironment();

		api.registerTool({
			name: 'glob',
			description:
				'Fast file pattern matching tool that returns paths of files matching a glob pattern. ' +
				'Use this to find files by name or extension (e.g. "**/*.ts", "src/**/*.test.js", "package.json"). ' +
				'Returns matching file paths as a list. ' +
				'Supports standard glob syntax: * (any characters in a segment), ** (any nested directories), ' +
				'? (single character), {a,b} (alternatives), [abc] (character classes). ' +
				'Use this tool when you need to discover files by name pattern — for searching file *contents*, use a different tool.',
			schema,
			async execute({ pattern, options }: GlobInput) {
				const files = await env.filesystem.glob(pattern, {
					root_dir: options.root_dir,
					ignore: options.exclude,
					limit: options.limit,
				});

				return { files };
			},
		});
	};
}
