import { z } from 'zod';
import type { Extension } from '../../../types/extension.js';
import type { CoreAPI } from '../../../api/core/api.js';
import type { EnvironmentAPI } from '../../../api/environment/api.js';
import { globDescription } from '../../system_prompts.js';

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
			description: globDescription,
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
