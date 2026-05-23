import type { AgentState } from '../../agent-state/index.js';
import type { CoreRegistry } from '../../registrations/index.js';
import type { ToolRegistry } from '../../tools/index.js';
import { compose } from './compose.js';
import { createPromptDecorator } from './prompt/index.js';
import { createToolDecorator } from './tool/index.js';
import { createTrackingDecorator } from './tracking/index.js';
import type { ProtocolDecorator } from './types.js';

/**
 * Turn core extension registrations into the ordered `ProtocolDecorator` stack
 * composed around the connected Mini-ACP client/server pair. Prompt-time
 * extension hooks are deliberately grouped so the client path reads as one
 * lifecycle: sync system prompt, build user prompt, send, then observe stream.
 */
export function createAgentDecorator(
	agentState: AgentState,
	registrations: CoreRegistry,
	toolRegistry: ToolRegistry,
): ProtocolDecorator {
	return compose(
		[
			createPromptDecorator(agentState, registrations),
			createToolDecorator(toolRegistry),
			createTrackingDecorator(agentState),
		].filter(isProtocolDecorator),
	);
}

function isProtocolDecorator(
	decorator: ProtocolDecorator | undefined,
): decorator is ProtocolDecorator {
	return decorator !== undefined;
}
