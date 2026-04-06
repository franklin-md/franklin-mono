import type { Extension } from '../../../types/extension.js';
import type { CoreAPI } from '../../../api/core/api.js';
import type { EnvironmentAPI } from '../../../api/environment/api.js';
import { globSpec } from './tools.js';

export function globExtension(): Extension<CoreAPI & EnvironmentAPI> {
	return (api) => {
		const env = api.getEnvironment();

		api.registerTool(globSpec, async ({ pattern, options }) => {
			const files = await env.filesystem.glob(pattern, {
				root_dir: options.root_dir,
				ignore: options.exclude,
				limit: options.limit,
			});

			return { files };
		});
	};
}
