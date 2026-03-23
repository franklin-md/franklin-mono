import type { MiniACPClient } from '@franklin/mini-acp';
import type { StoreResult } from '@franklin/extensions';

/**
 * The commands available on an agent — mirrors MiniACPClient.
 */
export type AgentCommands = MiniACPClient;

/**
 * A running agent: commands + tool execution + stores + lifecycle.
 *
 * - Commands (`initialize`, `setContext`, `prompt`, `cancel`) are wrapped
 *   with extension middleware.
 * - `toolExecute` handles tool calls from the protocol, with extension-
 *   registered tools short-circuiting before reaching the default handler.
 * - Stores are accessed via `agent.stores.stores.get(name)`.
 */
export type Agent = AgentCommands & {
	stores: StoreResult;
	dispose: () => Promise<void>;
};
