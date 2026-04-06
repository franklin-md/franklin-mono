import type { EnvironmentAPI, Extension } from '@franklin/extensions';
import type { CoreAPI } from '../../../api/core/api.js';
import type { StoreAPI } from '../../../api/store/api.js';
import { fileKey } from '../edit/key.js';

import { sha256Hex } from '../hash.js';
import { readFileSpec } from './tools.js';

// Read file extension that keeps track of the last version of a file that
// an agent has seen.
export function readExtension(): Extension<
	CoreAPI & EnvironmentAPI & StoreAPI
> {
	return (api) => {
		const store = api.useStore(fileKey);
		const fs = api.getEnvironment().filesystem;

		api.registerTool(readFileSpec, async ({ path, limit, offset }) => {
			const bytes = await fs.readFile(path);
			const absPath = await fs.resolve(path);

			const hash = sha256Hex(bytes);
			store.set((draft) => {
				draft[absPath] = hash;
			});

			const lines = new TextDecoder().decode(bytes).split('\n');
			const start = (offset ?? 1) - 1;
			return lines.slice(start, start + limit).join('\n');
		});
	};
}
