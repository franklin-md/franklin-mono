import type { Extension } from '../../types/extension.js';
import type { CoreAPI } from '../../api/core/api.js';
import type { SandboxAPI } from '../../api/sandbox/api.js';
import {
	createReadToolDefinition,
	createWriteToolDefinition,
	createEditToolDefinition,
	createGrepToolDefinition,
	createFindToolDefinition,
	createLsToolDefinition,
} from '@mariozechner/pi-coding-agent';
import { bridgePiToolDefinition } from '../../api/sandbox/bridge.js';
import {
	toReadOperations,
	toWriteOperations,
	toEditOperations,
	toGrepOperations,
	toFindOperations,
	toLsOperations,
} from '../../api/sandbox/adapters.js';
import {
	readSchema,
	writeSchema,
	editSchema,
	grepSchema,
	findSchema,
	lsSchema,
} from '../../api/sandbox/schemas.js';

/**
 * Extension that registers filesystem tools (read, write, edit, grep, find, ls)
 * backed by the sandbox's Filesystem handle.
 *
 * Uses Pi's tool implementations for truncation, fuzzy matching, path
 * resolution, etc. — routed through the sandbox abstraction.
 */
export function fsExtension(): Extension<CoreAPI & SandboxAPI> {
	return (api) => {
		const { cwd, fs } = api.getSandbox();

		const piRead = createReadToolDefinition(cwd, {
			operations: toReadOperations(fs),
		});
		const piWrite = createWriteToolDefinition(cwd, {
			operations: toWriteOperations(fs),
		});
		const piEdit = createEditToolDefinition(cwd, {
			operations: toEditOperations(fs),
		});
		const piGrep = createGrepToolDefinition(cwd, {
			operations: toGrepOperations(fs),
		});
		const piFind = createFindToolDefinition(cwd, {
			operations: toFindOperations(fs),
		});
		const piLs = createLsToolDefinition(cwd, {
			operations: toLsOperations(fs),
		});

		api.registerTool(bridgePiToolDefinition(piRead, readSchema));
		api.registerTool(bridgePiToolDefinition(piWrite, writeSchema));
		api.registerTool(bridgePiToolDefinition(piEdit, editSchema));
		api.registerTool(bridgePiToolDefinition(piGrep, grepSchema));
		api.registerTool(bridgePiToolDefinition(piFind, findSchema));
		api.registerTool(bridgePiToolDefinition(piLs, lsSchema));
	};
}
