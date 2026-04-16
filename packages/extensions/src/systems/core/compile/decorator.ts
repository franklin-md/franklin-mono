import type { MiniACPAgent, MiniACPClient } from '@franklin/mini-acp';

/**
 * A bidirectional protocol decorator.
 *
 * Wraps both the server (inbound tool execution) and client (outbound
 * requests). The client wrapper is async so decorators can perform
 * setup — like seeding state — on the inner client during wrapping.
 */
export type ProtocolDecorator = {
	readonly name: string;
	readonly server: (server: MiniACPAgent) => Promise<MiniACPAgent>;
	readonly client: (client: MiniACPClient) => Promise<MiniACPClient>;
};

/**
 * Apply a decorator stack to both protocol sides.
 *
 * Stack is ordered innermost → outermost for the server side.
 * Client applies in reverse — wrapping adds an outer layer, and the
 * two sides face opposite directions:
 *
 *   transport ←→ [outermost] ←→ [innermost] ←→ app
 *
 *   Server inbound:  outermost.server → innermost.server → fallback
 *   Client outbound: innermost.client → outermost.client → transport
 */
export async function applyDecorators(
	stack: readonly ProtocolDecorator[],
	base: { server: MiniACPAgent; client: MiniACPClient },
	onServerReady?: (server: MiniACPAgent) => Promise<void>,
): Promise<{ server: MiniACPAgent; client: MiniACPClient }> {
	let server = base.server;
	for (const d of stack) server = await d.server(server);

	if (onServerReady) await onServerReady(server);

	let client = base.client;
	for (const d of stack.toReversed()) client = await d.client(client);

	return { server, client };
}
