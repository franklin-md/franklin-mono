import type { EnvironmentAPI, Extension } from '@franklin/extensions';
import type { CoreAPI } from '../../../api/core/api.js';
import type { StoreAPI } from '../../../api/store/api.js';
import { sha256Hex } from '../hash.js';
import { z } from 'zod';

const schema = z.object({
	path: z
		.string()
		.describe(
			'Path to the file. Relative file paths (like `../../path.to.file `)' +
				"are accepted as arguments, but the request may be denied if the file path is outside of the scope of this agent's environment",
		),
	limit: z.number().default(2000).describe('Number of lines to read'),
	offset: z
		.number()
		.optional()
		.describe(
			'Line number to start reading from. By default starts at 1. (OPTIONAL)',
		),
});

type ReadInput = z.infer<typeof schema>;

// Read file extension that keeps track of the last version of a file that
// an agent has seen.
export function readExtension(): Extension<
	CoreAPI & EnvironmentAPI & StoreAPI
> {
	return (api) => {
		const store = api.useStore<Record<string, string>>('last_read');
		const fs = api.getEnvironment().filesystem;

		api.registerTool({
			name: 'read_file',
			description:
				'Tool used to read the contents of the specified file on the available filesystem.' +
				'This tool can only read files, not directories. ',
			schema,
			async execute({ path, limit, offset }: ReadInput) {
				const bytes = await fs.readFile(path);
				const absPath = await fs.resolve(path);

				const hash = await sha256Hex(bytes);
				store.set((draft) => {
					draft[absPath] = hash;
				});

				const lines = new TextDecoder().decode(bytes).split('\n');
				const start = (offset ?? 1) - 1;
				return lines.slice(start, start + limit).join('\n');
			},
		});
	};
}
