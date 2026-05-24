import type { Context } from '@franklin/mini-acp';
import type { CoreRegistry } from '../registrations/index.js';
import type { SessionSnapshot, ToolFilter } from '../state.js';
import type { ToolRegistry } from '../tools/index.js';
import type { AgentController } from './types.js';
import { bindAgentClient } from './client.js';
import { createControllerServer } from './server.js';
import { createAgentSession } from './session.js';

type CreateAgentControllerInput = {
	readonly snapshot: SessionSnapshot;
	readonly registrations: CoreRegistry;
	readonly toolRegistry: ToolRegistry;
};

export function createAgentController(
	input: CreateAgentControllerInput,
): AgentController {
	const session = createAgentSession(input);
	const server = createControllerServer({
		registrations: input.registrations,
		session,
		toolRegistry: input.toolRegistry,
	});

	return {
		server,
		bind(client) {
			return bindAgentClient({
				client,
				registrations: input.registrations,
				session,
			});
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
