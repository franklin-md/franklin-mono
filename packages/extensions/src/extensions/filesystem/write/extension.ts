import type { Extension } from '@franklin/extensions';
import type {
	CoreAPI,
	EnvironmentAPI,
	StoreAPI,
} from 'packages/extensions/src/api/index.js';
import { z } from 'zod';

const schema = z.object({
	path: z
		.string()
		.describe(
			'Path to the file. Relative file paths (like `../../path.to.file `)' +
				"are accepted as arguments, but the request may be denied if the file path is outside of the scope of this agent's environment",
		),
	content: z.string().describe('The content to write to the file.'),
});

type WriteInput = z.infer<typeof schema>;

export function writeExtension(): Extension<
	CoreAPI & EnvironmentAPI & StoreAPI
> {
	return (api) => {
		const fs = api.getEnvironment().filesystem;

		api.registerTool({
			name: 'write_file',
			description:
				'Writes a file to the local filesystem.' +
				'This tool will overwrite the existing file if there is one at the provided path.' +
				'Prefer the Edit tool for modifying existing files, if the tool exists – it only sends the diff.' +
				'Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.',
			schema,
			async execute({ path, content }: WriteInput) {
				await fs.writeFile(path, content);
			},
		});
	};
}
