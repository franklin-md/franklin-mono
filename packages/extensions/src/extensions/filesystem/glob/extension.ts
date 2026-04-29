import { truncateStream } from '@franklin/lib';
import type { Extension } from '../../../algebra/types/index.js';
import type { CoreAPI } from '../../../systems/core/index.js';
import type { EnvironmentRuntime } from '../../../systems/environment/runtime.js';
import { globSpec } from './tools.js';

const MAX_FORMATTED_CHARS = 12_000;

export function globExtension(): Extension<CoreAPI<EnvironmentRuntime>> {
	return (api) => {
		api.registerTool(globSpec, async ({ pattern, options }, ctx) => {
			const env = ctx.environment;
			const rootDir = options.root_dir
				? await env.filesystem.resolve(options.root_dir)
				: undefined;
			const files = await env.filesystem.glob(pattern, {
				root_dir: rootDir,
				ignore: options.exclude,
				limit: options.limit,
			});

			const { text, truncated } = truncateStream(files, {
				maxLength: MAX_FORMATTED_CHARS,
				separator: '\n',
				suffix: `[OUTPUT WAS TRUNCATED TO ${MAX_FORMATTED_CHARS} CHARACTERS]`,
			});

			if (truncated) {
				return text;
			}
			if (options.limit) {
				return (
					text + '\n' + `[OUTPUT IS LIMITED TO FIRST ${options.limit} RESULTS]`
				);
			}

			return text;
		});
	};
}
