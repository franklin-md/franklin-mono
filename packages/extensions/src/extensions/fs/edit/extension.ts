import type { Extension } from '../../../types/extension.js';
import type { CoreAPI } from '../../../api/core/api.js';
import type { SandboxAPI } from '../../../api/sandbox/api.js';
import { createEditToolDefinition } from '@mariozechner/pi-coding-agent';
import { bridgePiToolDefinition } from '../../../api/sandbox/bridge.js';
import { toEditOperations } from '../../../api/sandbox/adapters.js';
import { editSchema } from './schema.js';

export function editExtension(): Extension<CoreAPI & SandboxAPI> {
	return (api) => {
		const { cwd, fs } = api.getSandbox();
		const piEdit = createEditToolDefinition(cwd, {
			operations: toEditOperations(fs),
		});
		api.registerTool(bridgePiToolDefinition(piEdit, editSchema));
	};
}
