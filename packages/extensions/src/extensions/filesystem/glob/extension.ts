import type { Extension } from '../../../algebra/types/index.js';
import type { CoreAPI } from '../../../systems/core/index.js';
import type { EnvironmentRuntime } from '../../../systems/environment/runtime.js';
import { globSpec } from './tools.js';

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

			return JSON.stringify({ files });
		});
	};
}
