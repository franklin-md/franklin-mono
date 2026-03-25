import { createDuplexPair } from '@franklin/transport';
import {
	createPiAdapter,
	createAgentConnection,
	createSessionAdapter,
	type ClientProtocol,
	type AgentProtocol,
} from '@franklin/mini-acp';
import { getModel, type Model } from '@mariozechner/pi-ai';

function defaultModel(): Model<string> {
	return getModel('openrouter', 'z-ai/glm-5');
}

export function spawn(): ClientProtocol {
	const model = defaultModel();
	// TODO: Type this correctly, it is already correct but message type is painful
	const { a, b } = createDuplexPair();
	const clientDuplex = a as unknown as ClientProtocol;
	const agentDuplex = b as unknown as AgentProtocol;

	// Phase 1: get the remote proxy (toolExecute) without needing handlers yet
	const { remote, bind } = createAgentConnection(agentDuplex);

	// Build handlers that capture the proxy directly — no forward-declaration needed
	const handlers = createSessionAdapter((ctx) =>
		createPiAdapter({
			client: remote,
			model,
			ctx,
		}),
	);

	// Phase 2: bind handlers and start dispatching
	bind(handlers);

	return clientDuplex;
}
