import { z } from 'zod';
import type { CoreAPI, EnvironmentAPI } from '../../api/index.js';
import type { Extension } from '@franklin/extensions';
import { bashDescription } from '../system_prompts.js';

const schema = z.object({
	cmd: z.string().describe('The shell command to execute'),
	description: z
		.string()
		.optional()
		.describe('Clear 5-10 word description. Optional but recommended.'),
	timeout: z
		.number()
		.optional()
		.default(120000)
		.describe('Milliseconds before timeout.'),
});

type BashInput = z.infer<typeof schema>;

export function bashExtension(): Extension<CoreAPI & EnvironmentAPI> {
	return (api) => {
		const terminal = api.getEnvironment().terminal;
		api.registerTool({
			name: 'bash',
			description: bashDescription,
			schema: schema,
			async execute({ cmd, timeout }: BashInput) {
				// TODO later: we could use the description to ask permission from the user
				const { exit_code, stdout, stderr } = await terminal.exec({
					cmd,
					timeout,
				});
				return `EXIT_CODE:${exit_code}\n\nSTDOUT:${stdout}\n\nSTDERR:${stderr}`;
			},
		});
	};
}
