import type { Extension } from '@franklin/extensions';
import type {
	CoreAPI,
	EnvironmentAPI,
	StoreAPI,
} from 'packages/extensions/src/api/index.js';
import { writeFileSpec } from './tools.js';

export function writeExtension(): Extension<
	CoreAPI & EnvironmentAPI & StoreAPI
> {
	return (api) => {
		const fs = api.getEnvironment().filesystem;

		api.registerTool(writeFileSpec, async ({ path, content }) => {
			await fs.writeFile(path, content);
		});
	};
}
