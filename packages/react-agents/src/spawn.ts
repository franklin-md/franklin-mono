import type {
	AgentConnection,
	AgentRegistry,
	SpawnFromConnectionOptions,
	SpawnOptions,
} from '@franklin/agent';
import {
	spawn as spawnAgentSession,
	spawnFromConnection as spawnAgentSessionFromConnection,
} from '@franklin/agent';

import { createSessionStore, type ReactAgentSession } from './session-store.js';

type ReactSpawnOptions = Omit<SpawnOptions, 'handler'>;
type ReactSpawnFromConnectionOptions = Omit<
	SpawnFromConnectionOptions,
	'handler'
>;
type AgentSessionResult = Awaited<ReturnType<typeof spawnAgentSession>>;

function attachStore(
	session: AgentSessionResult,
	store: ReactAgentSession['store'],
): ReactAgentSession {
	return {
		...session,
		store,
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

export async function spawnFromConnection(
	connection: AgentConnection,
	options: ReactSpawnFromConnectionOptions,
): Promise<ReactAgentSession> {
	const { store, middleware, handler } = createSessionStore();
	const session = await spawnAgentSessionFromConnection(connection, {
		...options,
		middlewares: [middleware, ...(options.middlewares ?? [])],
		handler,
	});
	return attachStore(session, store);
}
