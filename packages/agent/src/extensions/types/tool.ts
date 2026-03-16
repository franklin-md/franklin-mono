import type { ToolDefinition } from '@franklin/local-mcp';

/**
 * A tool registered by an extension. Extends the local-mcp ToolDefinition
 * (which provides name, description, and Zod schema) with an execute handler.
 *
 * The MCP transport is pure RPC — it serializes whatever execute() returns.
 * No content block wrapping is imposed at this layer.
 */
export interface ExtensionToolDefinition<
	TInput = unknown,
	TOutput = unknown,
> extends ToolDefinition<TInput> {
	execute(params: TInput): Promise<TOutput>;
}
