import { serializeTool } from '@franklin/local-mcp';
import type { McpTransport } from '@franklin/local-mcp';
import type { AgentMiddleware } from '../../types.js';
import type { Extension } from '../types/index.js';
import { buildMiddleware } from './build.js';
import { collect } from './collect.js';
import { startTransport } from './start.js';
import type { McpTransportFactory } from './start.js';

export type { McpTransportFactory } from './start.js';

/**
 * Compiles an Extension into an AgentMiddleware (transport wrapper).
 *
 * Steps:
 * 1. Collect — run setup() to gather hooks and tools
 * 2. Start — create MCP transport and wire tool dispatch (if tools registered)
 * 3. Build — construct the transport wrapper from collected state
 */
export async function compileExtension(
	extension: Extension<any>,
	transportFactory: McpTransportFactory,
): Promise<AgentMiddleware> {
	const state = await collect(extension);

	let transport: McpTransport | undefined;
	if (state.tools.length > 0) {
		transport = await transportFactory(
			extension.name,
			state.tools.map(serializeTool),
		);
		await startTransport(extension.name, state.tools, transport);
	}

	return buildMiddleware(state, transport);
}

export async function compileExtensions(
	extensions: readonly Extension<any>[],
	transportFactory: McpTransportFactory,
): Promise<AgentMiddleware> {
	const mws = await Promise.all(
		extensions.map((ext) => compileExtension(ext, transportFactory)),
	);
	// Earlier extensions are outer (closer to app), later ones are inner
	// (closer to agent). This means observers listed first see the raw
	// prompt before transformers listed later modify it.
	return mws.reduce<AgentMiddleware>(
		(composed, mw) => (t) => composed(mw(t)),
		(t) => t,
	);
}
