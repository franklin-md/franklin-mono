import type { MiniACPAgent, MiniACPClient } from '@franklin/mini-acp';

/**
 * A bidirectional protocol decorator.
 *
 * Wraps both the agent (inbound tool execution) and client (outbound
 * requests). The client wrapper is async so decorators can perform
 * setup — like seeding state — on the inner client during wrapping.
 */
export type ProtocolDecorator = {
	readonly name: string;
	readonly agent: (agent: MiniACPAgent) => Promise<MiniACPAgent>;
	readonly client: (client: MiniACPClient) => Promise<MiniACPClient>;
};

/**
 * Apply a decorator stack to both protocol sides.
 *
 * Stack is ordered innermost → outermost for the server (agent) side.
 * Client applies in reverse — wrapping adds an outer layer, and the
 * two sides face opposite directions:
 *
 *   transport ←→ [outermost] ←→ [innermost] ←→ app
 *
 *   Server inbound:  outermost.agent  → innermost.agent  → fallback
 *   Client outbound: innermost.client → outermost.client → transport
 */
export async function applyDecorators(
	stack: readonly ProtocolDecorator[],
	base: { agent: MiniACPAgent; client: MiniACPClient },
	onAgentReady?: (agent: MiniACPAgent) => Promise<void>,
): Promise<{ agent: MiniACPAgent; client: MiniACPClient }> {
	let agent = base.agent;
	for (const d of stack) agent = await d.agent(agent);

	if (onAgentReady) await onAgentReady(agent);

	let client = base.client;
	for (const d of stack.toReversed()) client = await d.client(client);

	return { agent, client };
}
