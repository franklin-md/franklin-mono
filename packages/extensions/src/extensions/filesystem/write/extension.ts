import type { Extension } from '@franklin/extensions';
import type {
	CoreAPI,
	EnvironmentAPI,
	StoreAPI,
} from 'packages/extensions/src/api/index.js';
import { writeFileDescription } from '../../system_prompts.js';
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
			description: writeFileDescription,
			schema,
			async execute({ path, content }: WriteInput) {
				await fs.writeFile(path, content);
			},
		});
	};
}
