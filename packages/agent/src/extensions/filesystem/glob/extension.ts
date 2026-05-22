import { truncateStream } from '@franklin/lib';
import { defineExtension } from '../../../modules/state/index.js';
import type { CoreModule } from '../../../modules/core/index.js';
import type { EnvironmentModule } from '../../../modules/environment/index.js';
import { limitedGlob } from './limited-glob.js';
import { globSpec } from './tools.js';

const MAX_FORMATTED_CHARS = 12_000;

export function globExtension() {
	return defineExtension<[CoreModule, EnvironmentModule]>((api) => {
		api.registerTool(globSpec, {
			execute: async ({ pattern, options }, ctx) => {
				const env = ctx.environment;
				const rootDir = options.root_dir
					? await env.filesystem.resolve(options.root_dir)
					: undefined;
				const { files, exceededLimit } = await limitedGlob(
					env.filesystem,
					pattern,
					{
						root_dir: rootDir,
						ignore: options.exclude,
						limit: options.limit,
					},
				);

				const { text, truncated } = truncateStream(files, {
					maxLength: MAX_FORMATTED_CHARS,
					separator: '\n',
					suffix: `[OUTPUT WAS TRUNCATED TO ${MAX_FORMATTED_CHARS} CHARACTERS]`,
				});

				if (truncated) {
					return text;
				}
				if (exceededLimit) {
					return (
						text +
						'\n' +
						`[OUTPUT IS LIMITED TO FIRST ${options.limit} RESULTS]`
					);
				}

				return text;
			},
		});
	});
}
