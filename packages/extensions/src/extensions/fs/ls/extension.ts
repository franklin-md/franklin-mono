import type { Extension } from '../../../types/extension.js';
import type { CoreAPI } from '../../../api/core/api.js';
import type { SandboxAPI } from '../../../api/sandbox/api.js';
import { createLsToolDefinition } from '@mariozechner/pi-coding-agent';
import { bridgePiToolDefinition } from '../../../api/sandbox/bridge.js';
import { toLsOperations } from '../../../api/sandbox/adapters.js';
import { lsSchema } from './schema.js';

export function lsExtension(): Extension<CoreAPI & SandboxAPI> {
	return (api) => {
		const { cwd, fs } = api.getSandbox();
		const piLs = createLsToolDefinition(cwd, {
			operations: toLsOperations(fs),
		});
		api.registerTool(bridgePiToolDefinition(piLs, lsSchema));
	};
}
