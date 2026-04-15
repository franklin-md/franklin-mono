import type { Extension } from '../../../types/extension.js';
import type { CoreAPI } from '../../../api/core/api.js';
import type { EnvironmentAPI } from '../../../api/environment/api.js';
import { globSpec } from './tools.js';

export function globExtension(): Extension<CoreAPI & EnvironmentAPI> {
	return (api) => {
		const env = api.getEnvironment();

		api.registerTool(globSpec, async ({ pattern, options }) => {
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
