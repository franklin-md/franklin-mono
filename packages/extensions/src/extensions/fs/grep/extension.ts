import type { Extension } from '../../../types/extension.js';
import type { CoreAPI } from '../../../api/core/api.js';
import type { SandboxAPI } from '../../../api/sandbox/api.js';
import { createGrepToolDefinition } from '@mariozechner/pi-coding-agent';
import { bridgePiToolDefinition } from '../../../api/sandbox/bridge.js';
import { toGrepOperations } from '../../../api/sandbox/adapters.js';
import { grepSchema } from './schema.js';

export function grepExtension(): Extension<CoreAPI & SandboxAPI> {
	return (api) => {
		const { cwd, fs } = api.getSandbox();
		const piGrep = createGrepToolDefinition(cwd, {
			operations: toGrepOperations(fs),
		});
		api.registerTool(bridgePiToolDefinition(piGrep, grepSchema));
	};
}
