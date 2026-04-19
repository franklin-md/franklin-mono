import type { CoreAPI } from '../../systems/core/index.js';
import type { EnvironmentRuntime } from '../../systems/environment/runtime.js';
import type { Extension } from '../../algebra/types/index.js';
import { bashSpec } from './tools.js';

export function bashExtension(): Extension<CoreAPI<EnvironmentRuntime>> {
	return (api) => {
		api.registerTool(bashSpec, async ({ cmd, timeout }, ctx) => {
			const { exit_code, stdout, stderr } = await ctx.environment.terminal.exec(
				{
					cmd,
					timeout,
				},
			);
			return `EXIT_CODE:${exit_code}\n\nSTDOUT:${stdout}\n\nSTDERR:${stderr}`;
		});
	};
}
