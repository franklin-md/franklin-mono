import type { Extension } from '@franklin/extensions';
import type { CoreAPI } from '../../../systems/core/api/api.js';
import type { EnvironmentAPI } from '../../../systems/environment/api/api.js';
import type { StoreAPI } from '../../../systems/store/api/api.js';
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
			const absPath = await fs.resolve(path);
			await fs.writeFile(absPath, content);
			await file.markFileRead(fs, path, content);
			return 'ok';
		});
	};
}
