import type { ContentBlock, McpServer } from '@agentclientprotocol/sdk';

// ---------------------------------------------------------------------------
// SystemPromptBuilder
// ---------------------------------------------------------------------------

/**
 * Accumulates system prompt fragments across module middlewares.
 *
 * Shared via a symbol key on `NewSessionRequest` params so that
 * `sequence()`-d module middlewares all contribute to the same builder.
 * The outermost middleware materializes the result on the first prompt.
 */
export class SystemPromptBuilder {
	private _prepended: string[] = [];
	private _appended: string[] = [];

	/** Add text before all existing content. */
	prepend(text: string): void {
		this._prepended.unshift(text);
	}

	/** Add text after all existing content. */
	append(text: string): void {
		this._appended.push(text);
	}

	/** Assemble the final text. Returns undefined if nothing was added. */
	build(): string | undefined {
		const parts = [...this._prepended, ...this._appended];
		return parts.length > 0 ? parts.join('\n\n') : undefined;
	}
}

// ---------------------------------------------------------------------------
// Module interface
// ---------------------------------------------------------------------------

/**
 * A FranklinModule extends an agent session with additional capabilities.
 *
 * Modules can inject MCP servers, add system prompt context, modify prompts,
 * and manage their own lifecycle. Each module is wrapped into a Middleware
 * via `createModuleMiddleware()`. Compose multiple modules with `sequence()`.
 */
export interface FranklinModule {
	name: string;

	/**
	 * Called once when a new session is created (during `newSession` interception).
	 * Can set up resources (e.g., MCP servers) and return them for injection
	 * into the session. Use `ctx.systemPrompt` to contribute system prompt text.
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
	/** Builder for accumulating system prompt fragments. */
	systemPrompt: SystemPromptBuilder;
}

export interface ModuleCreateResult {
	/** MCP servers to inject into the session's newSession request. */
	mcpServers?: McpServer[];
}

export interface ModulePromptContext {
	sessionId: string;
	prompt: ContentBlock[];
}
