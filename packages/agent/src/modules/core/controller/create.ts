import type { Context, MiniACPClientHandle } from '@franklin/mini-acp';
import type { CoreRegistry } from '../registrations/index.js';
import type { SessionSnapshot, ToolFilter } from '../state.js';
import type { ToolRegistry } from '../tools/index.js';
import type { AgentController } from './types.js';
import { bindAgentClient } from './client.js';
import { createControllerServer } from './server.js';
import { createAgentSession } from './session.js';
import type { Summarize } from '../compaction/types.js';

type CreateAgentControllerInput = {
	readonly snapshot: SessionSnapshot;
	readonly registrations: CoreRegistry;
	readonly toolRegistry: ToolRegistry;
	readonly summarize?: Summarize;
};

export function createAgentController(
	input: CreateAgentControllerInput,
): AgentController {
	const session = createAgentSession(input);
	let connectedClient: MiniACPClientHandle | undefined;
	const server = createControllerServer({
		registrations: input.registrations,
		session,
		toolRegistry: input.toolRegistry,
	});

	return {
		server: {
			...server,
			async prepareContext(params) {
				if (!connectedClient) throw new Error('Agent is not connected');
				await session.prepareContext(params, connectedClient);
			},
		},
		bind(client) {
			connectedClient = client;
			return bindAgentClient({
				client,
				registrations: input.registrations,
				session,
			});
		},
		compact() {
			if (!connectedClient) throw new Error('Agent is not connected');
			return session.compact(connectedClient);
		},
		setToolEnabled(name, enabled) {
			const before = input.toolRegistry.filter();
			input.toolRegistry.setEnabled(name, enabled);
			return !sameToolFilter(before, input.toolRegistry.filter());
		},
		getSession: () => session.getSnapshot(),
		inspect() {
			return {
				core: redactInspectContext(session.getSentContext()),
			};
		},
	};
}

function sameToolFilter(left: ToolFilter, right: ToolFilter): boolean {
	return JSON.stringify(left.disabled) === JSON.stringify(right.disabled);
}

function redactInspectContext(context: Context): Context {
	const { apiKey: _apiKey, ...config } = context.config;
	return { ...context, config };
}
