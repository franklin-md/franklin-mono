import type { CoreAPI } from '../../systems/core/index.js';
import type { EnvironmentRuntime } from '../../systems/environment/runtime.js';
import type { Extension } from '../../algebra/types/index.js';
import { bashSpec } from './tools.js';
import { shellArgs } from './shell-args.js';

export function bashExtension(): Extension<CoreAPI<EnvironmentRuntime>> {
	return (api) => {
		api.registerTool(bashSpec, async ({ cmd, timeout }, ctx) => {
			const shell = await ctx.environment.osInfo.getShellInfo();
			const { exit_code, stdout, stderr } = await ctx.environment.process.exec({
				file: shell.path,
				args: shellArgs(shell.family, cmd),
				timeout,
			});
			const output = `EXIT_CODE:${exit_code}\n\nSTDOUT:${stdout}\n\nSTDERR:${stderr}`;
			if (exit_code !== 0) {
				return {
					content: [
						{
							type: 'text',
							text: `Command exited with code ${exit_code}.\n\n${output}`,
						},
					],
					isError: true,
				};
			}
			return output;
		});
	};
}
