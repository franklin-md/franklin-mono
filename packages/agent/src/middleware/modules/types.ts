import type { ContentBlock, McpServer } from '@agentclientprotocol/sdk';

// ---------------------------------------------------------------------------
// Module interface
// ---------------------------------------------------------------------------

/**
 * A FranklinModule extends an agent session with additional capabilities.
 *
 * Modules can inject MCP servers, add system prompt context, modify prompts,
 * and manage their own lifecycle. They are composed into a single Middleware
 * via `createModuleMiddleware()`.
 */
export interface FranklinModule {
	name: string;

	/**
	 * Called once when a new session is created (during `newSession` interception).
	 * Can set up resources (e.g., MCP servers) and return them for injection
	 * into the session, along with optional system prompt text.
	 */
	onCreate?(
		ctx: ModuleCreateContext,
	): Promise<ModuleCreateResult> | ModuleCreateResult;

	/**
	 * Called before each prompt. Can modify the prompt content blocks
	 * (e.g., prepend dynamic context that changes per turn).
	 */
	onPrompt?(
		ctx: ModulePromptContext,
	): Promise<ModulePromptContext> | ModulePromptContext;

	/**
	 * Called on dispose. Clean up resources (MCP servers, etc.).
	 */
	onDispose?(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook contexts
// ---------------------------------------------------------------------------

export interface ModuleCreateContext {
	/** Working directory for the session. */
	cwd: string;
}

export interface ModuleCreateResult {
	/** MCP servers to inject into the session's newSession request. */
	mcpServers?: McpServer[];
	/** Static system prompt text prepended to the first prompt only. */
	systemPrompt?: string;
}

export interface ModulePromptContext {
	sessionId: string;
	prompt: ContentBlock[];
}
