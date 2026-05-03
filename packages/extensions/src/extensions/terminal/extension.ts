import { defineExtension } from '../../harness/modules/index.js';
import type { CoreModule } from '../../modules/core/index.js';
import type { EnvironmentModule } from '../../modules/environment/index.js';
import { shellArgs } from './shell-args.js';
import { bashSpec } from './tools.js';

export function bashExtension() {
	return defineExtension<[CoreModule, EnvironmentModule]>((api) => {
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
	});
}
