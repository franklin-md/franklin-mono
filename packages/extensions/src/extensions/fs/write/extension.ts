import type { Extension } from '../../../types/extension.js';
import type { CoreAPI } from '../../../api/core/api.js';
import type { SandboxAPI } from '../../../api/sandbox/api.js';
import { createWriteToolDefinition } from '@mariozechner/pi-coding-agent';
import { bridgePiToolDefinition } from '../../../api/sandbox/bridge.js';
import { toWriteOperations } from '../../../api/sandbox/adapters.js';
import { writeSchema } from './schema.js';

export function writeExtension(): Extension<CoreAPI & SandboxAPI> {
	return (api) => {
		const { cwd, fs } = api.getSandbox();
		const piWrite = createWriteToolDefinition(cwd, {
			operations: toWriteOperations(fs),
		});
		api.registerTool(bridgePiToolDefinition(piWrite, writeSchema));
	};
}
