import type {
	AgentRegistry,
	SpawnOptions,
	SpawnFromTransportOptions,
} from '@franklin/agent';
import {
	spawn as spawnAgentSession,
	spawnFromTransport as spawnAgentSessionFromTransport,
} from '@franklin/agent';

import type { Transport } from '@franklin/agent';

import { createSessionStore, type ReactAgentSession } from './session-store.js';

type ReactSpawnOptions = Omit<SpawnOptions, 'handler'>;
type ReactSpawnFromTransportOptions = Omit<
	SpawnFromTransportOptions,
	'handler'
>;
type AgentSessionResult = Awaited<ReturnType<typeof spawnAgentSession>>;

function attachStore(
	session: AgentSessionResult,
	store: ReactAgentSession['store'],
): ReactAgentSession {
	return {
		commands: session.commands,
		sessionId: session.sessionId,
		store,
		dispose: () => session.dispose(),
	};
}

export async function spawn(
	registry: AgentRegistry,
	options: ReactSpawnOptions,
): Promise<ReactAgentSession> {
	const { store, middleware, handler } = createSessionStore();
	const session = await spawnAgentSession(registry, {
		...options,
		middlewares: [middleware, ...(options.middlewares ?? [])],
		handler,
	});
	return attachStore(session, store);
}

export async function spawnFromTransport(
	transport: Transport,
	options: ReactSpawnFromTransportOptions,
): Promise<ReactAgentSession> {
	const { store, middleware, handler } = createSessionStore();
	const session = await spawnAgentSessionFromTransport(transport, {
		...options,
		middlewares: [middleware, ...(options.middlewares ?? [])],
		handler,
	});
	return attachStore(session, store);
}
