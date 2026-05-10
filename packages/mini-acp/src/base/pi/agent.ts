import type { StreamFn } from '@mariozechner/pi-agent-core';

import { createSessionAdapter } from '../../protocol/adapter.js';
import type { MuAgent, MuClient } from '../../protocol/types.js';
import { createPiAdapter } from './adapter.js';

export type CreatePiAgentOptions = {
	streamFn?: StreamFn;
};

export function createPiAgent(
	server: MuAgent,
	options: CreatePiAgentOptions = {},
): MuClient {
	const { streamFn } = options;
	return createSessionAdapter(
		(ctx, trackedServer) =>
			createPiAdapter({ ctx, server: trackedServer, streamFn }),
		server,
	);
}
