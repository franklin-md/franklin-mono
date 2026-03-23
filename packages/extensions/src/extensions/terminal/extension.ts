import type { Extension } from '../../types/extension.js';
import type { CoreAPI } from '../../api/core/api.js';
import type { SandboxAPI } from '../../api/sandbox/api.js';
import { createBashToolDefinition } from '@mariozechner/pi-coding-agent';
import { bridgePiToolDefinition } from '../../api/sandbox/bridge.js';
import { toBashOperations } from '../../api/sandbox/adapters.js';
import { bashSchema } from '../../api/sandbox/schemas.js';

/**
 * Extension that registers the bash tool backed by the sandbox's
 * Terminal handle.
 *
 * Uses Pi's bash implementation for process management, output
 * streaming, and truncation — routed through the sandbox abstraction.
 */
export function terminalExtension(): Extension<CoreAPI & SandboxAPI> {
	return (api) => {
		const { cwd, terminal } = api.getSandbox();

		const piBash = createBashToolDefinition(cwd, {
			operations: toBashOperations(terminal),
		});

		api.registerTool(bridgePiToolDefinition(piBash, bashSchema));
	};
}
