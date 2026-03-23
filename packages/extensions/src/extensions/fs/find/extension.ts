import type { Extension } from '../../../types/extension.js';
import type { CoreAPI } from '../../../api/core/api.js';
import type { SandboxAPI } from '../../../api/sandbox/api.js';
import { createFindToolDefinition } from '@mariozechner/pi-coding-agent';
import { bridgePiToolDefinition } from '../../../api/sandbox/bridge.js';
import { toFindOperations } from '../../../api/sandbox/adapters.js';
import { findSchema } from './schema.js';

export function findExtension(): Extension<CoreAPI & SandboxAPI> {
	return (api) => {
		const { cwd, fs } = api.getSandbox();
		const piFind = createFindToolDefinition(cwd, {
			operations: toFindOperations(fs),
		});
		api.registerTool(bridgePiToolDefinition(piFind, findSchema));
	};
}
