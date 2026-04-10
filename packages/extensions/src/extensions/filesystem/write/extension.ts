import type { Extension } from '@franklin/extensions';
import type {
	CoreAPI,
	EnvironmentAPI,
	StoreAPI,
} from 'packages/extensions/src/api/index.js';
import { fileKey } from '../common/key.js';
import { createFileControl } from '../common/control.js';
import { writeFileSpec } from './tools.js';

export function writeExtension(): Extension<
	CoreAPI & EnvironmentAPI & StoreAPI
> {
	return (api) => {
		const fs = api.getEnvironment().filesystem;
		const file = createFileControl(api.useStore(fileKey));

		api.registerTool(writeFileSpec, async ({ path, content }) => {
			await fs.writeFile(path, content);
			await file.markFileRead(fs, path, content);
			return 'ok';
		});
	};
}
