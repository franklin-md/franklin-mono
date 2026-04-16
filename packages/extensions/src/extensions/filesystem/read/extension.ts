import type { EnvironmentAPI, Extension } from '@franklin/extensions';
import { decode } from '@franklin/lib';
import type { CoreAPI } from '../../../api/core/api.js';
import type { StoreAPI } from '../../../api/store/api.js';
import { fileKey } from '../common/key.js';
import { createFileControl } from '../common/control.js';
import { readFileSpec } from './tools.js';

// Read file extension that keeps track of the last version of a file that
// an agent has seen.
export function readExtension(): Extension<
	CoreAPI & EnvironmentAPI & StoreAPI
> {
	return (api) => {
		const fs = api.getEnvironment().filesystem;
		const file = createFileControl(api.useStore(fileKey));

		api.registerTool(readFileSpec, async ({ path, limit, offset }) => {
			const absPath = await fs.resolve(path);
			const bytes = await fs.readFile(absPath);
			await file.markFileRead(fs, path, bytes);

			const lines = decode(bytes).split('\n');
			const start = (offset ?? 1) - 1;
			return lines.slice(start, start + limit).join('\n');
		});
	};
}
