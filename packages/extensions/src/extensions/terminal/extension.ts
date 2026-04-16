import type { CoreAPI } from '../../systems/core/index.js';
import type { EnvironmentAPI } from '../../systems/environment/index.js';
import type { Extension } from '../../algebra/types/index.js';
import { bashSpec } from './tools.js';

export function bashExtension(): Extension<CoreAPI & EnvironmentAPI> {
	return (api) => {
		const terminal = api.getEnvironment().terminal;
		api.registerTool(bashSpec, async ({ cmd, timeout }) => {
			const { exit_code, stdout, stderr } = await terminal.exec({
				cmd,
				timeout,
			});
			return `EXIT_CODE:${exit_code}\n\nSTDOUT:${stdout}\n\nSTDERR:${stderr}`;
		});
	};
}
