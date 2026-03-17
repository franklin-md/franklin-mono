import { serializeTool } from '@franklin/local-mcp';
import type { Middleware } from '../../middleware/types.js';
import type { Extension } from '../types/index.js';
import { buildMiddleware } from './build.js';
import { collect } from './collect.js';
import { startTransport } from './start.js';
import type { McpTransportFactory } from './start.js';

export type { McpTransportFactory } from './start.js';

/**
 * Compiles an Extension into a Middleware with lifecycle.
 *
 * Steps:
 * 1. Collect — run setup() to gather hooks and tools
 * 2. Start — create MCP transport and wire tool dispatch (if tools registered)
 * 3. Build — construct the middleware from collected state
 */
export async function compileExtension(
	extension: Extension,
	transportFactory: McpTransportFactory,
): Promise<Middleware> {
	const state = await collect(extension);

	const transport = await transportFactory(state.tools.map(serializeTool));

	if (state.tools.length > 0) {
		// TODO: Should we really having middleware define lifecycle (dispose AND start?)
		await startTransport(extension.name, state.tools, transport);
	}

	return buildMiddleware(state, transport);
}
