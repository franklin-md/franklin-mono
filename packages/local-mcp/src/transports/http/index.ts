import { mapStream, ndjsonCodec } from '@franklin/transport';

import type {
	HttpPipeResponse as Response,
	HttpJsonServer,
} from '@franklin/transport';
import type {
	LocalMcpTransport,
	ToolCallRequest,
	ToolCallStream,
} from '../../types.js';
import type { AnyToolDefinition } from '../../tools/types.js';
import { createRelayConfig } from '../../relay-config.js';
import { asStream } from 'node_modules/@franklin/transport/src/http/stream.js';
import { serializeTool } from '../../browser.js';

type Options = {
	tools: AnyToolDefinition[];
	// TODO: Should we pass in the options instead?
	server: HttpJsonServer;
};

export async function createTransport(
	options: Options,
): Promise<LocalMcpTransport> {
	const rawStream = asStream(options.server);
	const stream = mapStream(
		rawStream,
		ndjsonCodec<ToolCallRequest | Response>(),
	) as unknown as ToolCallStream; // TODO: Can we type this better? This is Uint ->ToolCall Request in one direction and Response -> Uint in the other direction.

	await options.server.start();

	const config = createRelayConfig({
		callbackUrl: options.server.url,
		tools: options.tools.map(serializeTool),
	});

	const dispose = async () => {
		await options.server.stop();
		await stream.close();
	};

	return {
		server: config,
		stream,
		dispose,
	};
}
