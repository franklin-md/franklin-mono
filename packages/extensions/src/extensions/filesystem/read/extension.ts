import type { Extension } from '../../../algebra/types/index.js';
import { decode } from '@franklin/lib';
import type { CoreAPI } from '../../../systems/core/index.js';
import type { StoreRuntime } from '../../../systems/store/runtime.js';
import type { EnvironmentRuntime } from '../../../systems/environment/runtime.js';
import { fileKey } from '../common/key.js';
import { createFileControl } from '../common/control.js';
import { readFileSpec } from './tools.js';

export function readExtension(): Extension<
	CoreAPI<EnvironmentRuntime & StoreRuntime>
> {
	return (api) => {
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
	};
}
