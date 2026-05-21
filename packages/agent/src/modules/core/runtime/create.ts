import type { Session } from '../session/index.js';
import { createClientRuntime } from './from-client.js';
import type { AgentClient, CoreRuntime } from './types.js';

type CreateCoreRuntimeInput = {
	readonly client: AgentClient;
	readonly session: Session;
};

export function createCoreRuntime({
	client,
	session,
}: CreateCoreRuntimeInput): CoreRuntime {
	return {
		...createClientRuntime(client),
		session,
	};
}
