// ---------------------------------------------------------------------------
// Session adapter — lifts a single-turn BaseAgent factory into a full
// MiniACPClient with session management (initialize, setContext, multi-turn).
// ---------------------------------------------------------------------------

import type { TurnClient, TurnServer } from '../base/types.js';
import type { Ctx } from '../types/context.js';
import type { MuClient, InitializeResult } from './types.js';

/**
 * Factory that creates a single-turn agent (TurnClient) from context and
 * a reverse-RPC client handle.
 */
export type BaseAgentFactory = (ctx: Ctx, client: TurnServer) => TurnClient;

/**
 * Wraps a BaseAgentFactory as a full MiniACPClient with session management.
 *
 * The adapter manages context state and agent lifecycle:
 * - `initialize()` acknowledges session start
 * - `setContext()` merges partial context and invalidates the current agent
 * - `prompt()` lazily creates an agent via the factory, then delegates
 * - `cancel()` forwards to the current agent (if any)
 *
 * @param factory - Creates a TurnClient from context + reverse-RPC client
 * @param getClient - Lazy accessor for the reverse-RPC client (TurnServer).
 *   Called on first prompt, not at construction time, so it's safe to pass
 *   a getter that references a binding created after this adapter.
 */
export function createSessionAdapter(
	factory: BaseAgentFactory,
	getClient: () => TurnServer,
): MuClient {
	const ctx: Ctx = {
		history: { systemPrompt: '', messages: [] },
		tools: [],
	};
	let agent: TurnClient | null = null;

	const ack: InitializeResult = {};

	return {
		async initialize() {
			return ack;
		},

		async setContext({ ctx: partial }) {
			if (partial.history) ctx.history = partial.history;
			if (partial.tools) ctx.tools = partial.tools;
			if (partial.config) ctx.config = partial.config;
			// Invalidate agent so next prompt uses new context
			agent = null;
			return ack;
		},

		prompt(params) {
			if (!agent) {
				agent = factory(ctx, getClient());
			}
			return agent.prompt(params);
		},

		async cancel(params) {
			if (!agent) {
				return {
					type: 'turnEnd' as const,
					error: { code: -1, message: 'No active prompt' },
				};
			}
			return agent.cancel(params);
		},
	};
}
