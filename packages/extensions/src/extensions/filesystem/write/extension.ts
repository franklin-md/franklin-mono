import type { Extension } from '../../../algebra/types/index.js';
import type { CoreAPI } from '../../../systems/core/index.js';
import type { EnvironmentRuntime } from '../../../systems/environment/runtime.js';
import type { StoreRuntime } from '../../../systems/store/runtime.js';
import { fileKey } from '../common/key.js';
import { createFileControl } from '../common/control.js';
import { writeFileSpec } from './tools.js';

export function writeExtension(): Extension<
	CoreAPI<EnvironmentRuntime & StoreRuntime>
> {
	return (api) => {
		api.registerTool(writeFileSpec, async ({ path, content }, ctx) => {
			const fs = ctx.environment.filesystem;
			const file = createFileControl(ctx.getStore(fileKey));
			const absPath = await fs.resolve(path);
			await fs.writeFile(absPath, content);
			await file.markFileRead(fs, path, content);
			return 'ok';
		});
	};
}
