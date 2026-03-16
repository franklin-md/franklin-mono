import {
	mapStream,
	ndjsonCodec,
	createCallbackServerPipe,
	HttpJsonServer,
	type HttpJsonServerOptions,
} from '@franklin/transport';

import type {
	McpTransport,
	McpToolStream,
	ToolCallRequest,
	ToolCallResponse,
} from '../../types.js';
import type { AnyToolDefinition } from '../../tools/types.js';
import { createRelayConfig } from '../../relay-config.js';
import { serializeTool } from '../../tools/serialize.js';

type Options = {
	tools: AnyToolDefinition[];
	// TODO: Should we pass in the options instead?
	serverOptions: HttpJsonServerOptions;
};

// TODO: In theory would could push the raw stream out (which could allow for something like multiplixing a single Server to:
// a) Mutliple tools
// b) Mutliple MCP servers
// c) Multiple Agents! (i.e. just need 1 port and 1 server for all agents, all Mcps and all tools!)

export async function createTransport(options: Options): Promise<McpTransport> {
	const server = new HttpJsonServer(options.serverOptions);
	const rawStream = createCallbackServerPipe(server);
	// mapStream uses a single type param for both directions; cast to the
	// directional McpToolStream (requests on readable, responses on writable).
	const stream = mapStream(
		rawStream,
		ndjsonCodec<ToolCallRequest | ToolCallResponse>(),
	) as unknown as McpToolStream;

	await server.start();

	const config = createRelayConfig({
		callbackUrl: server.url,
		tools: options.tools.map(serializeTool),
	});

	const dispose = async () => {
		await server.stop();
		await stream.close();
	};

	return {
		config,
		stream,
		dispose,
	};
}
