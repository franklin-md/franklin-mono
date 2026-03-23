import type { Extension } from '../../../types/extension.js';
import type { CoreAPI } from '../../../api/core/api.js';
import type { SandboxAPI } from '../../../api/sandbox/api.js';
import { createReadToolDefinition } from '@mariozechner/pi-coding-agent';
import { bridgePiToolDefinition } from '../../../api/sandbox/bridge.js';
import { toReadOperations } from '../../../api/sandbox/adapters.js';
import { readSchema } from './schema.js';

export function readExtension(): Extension<CoreAPI & SandboxAPI> {
	return (api) => {
		const { cwd, fs } = api.getSandbox();
		const piRead = createReadToolDefinition(cwd, {
			operations: toReadOperations(fs),
		});
		api.registerTool(bridgePiToolDefinition(piRead, readSchema));
	};
}
