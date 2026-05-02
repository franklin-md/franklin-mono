import { decode } from '@franklin/lib';
import { defineExtension } from '../../../harness/modules/index.js';
import type { CoreModule } from '../../../modules/core/index.js';
import type { EnvironmentModule } from '../../../modules/environment/index.js';
import type { StoreModule } from '../../../modules/store/index.js';
import { createFileControl } from '../common/control.js';
import { fileKey } from '../common/key.js';
import { readFileSpec } from './tools.js';

export function readExtension() {
	return defineExtension<[CoreModule, StoreModule, EnvironmentModule]>(
		(api) => {
			api.registerTool(readFileSpec, async ({ path, limit, offset }, ctx) => {
				const fs = ctx.environment.filesystem;
				const file = createFileControl(ctx.getStore(fileKey));
				const absPath = await fs.resolve(path);
				const bytes = await fs.readFile(absPath);
				await file.markFileRead(fs, path, bytes);

				const lines = decode(bytes).split('\n');
				const start = (offset ?? 1) - 1;
				return lines.slice(start, start + limit).join('\n');
			});
		},
	);
}
