import { defineExtension } from '../../../harness/modules/index.js';
import type { CoreModule } from '../../../modules/core/index.js';
import type { EnvironmentModule } from '../../../modules/environment/index.js';
import type { StoreModule } from '../../../modules/store/index.js';
import { createFileControl } from '../common/control.js';
import { fileKey } from '../common/key.js';
import { writeFileSpec } from './tools.js';

export function writeExtension() {
	return defineExtension<[CoreModule, StoreModule, EnvironmentModule]>(
		(api) => {
			api.registerTool(writeFileSpec, async ({ path, content }, ctx) => {
				const fs = ctx.environment.filesystem;
				const file = createFileControl(ctx.getStore(fileKey));
				const absPath = await fs.resolve(path);
				await fs.writeFile(absPath, content);
				await file.markFileRead(fs, path, content);
				return 'ok';
			});
		},
	);
}
