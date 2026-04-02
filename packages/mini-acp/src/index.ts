// Types
export type {
	// Content
	Content,
	UserContent,
	AssistantContent,
	ToolResultContent,
	TextContent,
	ThinkingContent,
	ImageContent,
	ToolCallContent,
	// Messages
	Message,
	UserMessage,
	AssistantMessage,
	ToolResultMessage,
	// Context
	Ctx,
	History,
	LLMConfig,
	ThinkingLevel,
	// Tools
	ToolDefinition,
	ToolCall,
	ToolResult,
	ToolExecuteParams,
	ToolExecuteHandler,
	TurnStart,
	Update,
	Chunk,
	TurnEnd,
	StreamEvent,
	StopReason,
	// Errors
	AuthError,
	OAuthError,
	APIKeyError,
} from './types/index.js';

// Base protocol
export type { BaseAgent, BaseClient } from './base/index.js';
export { createPiAdapter, type PiAdapterOptions } from './base/index.js';
export { createPiAgentFactory } from './base/index.js';
export {
	fromPiUserContent,
	fromPiAssistantContent,
	fromPiToolResultContent,
	fromPiMessage,
	fromAgentEvent,
	bridgeTool,
	toPiUserMessage,
	toPiMessage,
} from './base/index.js';

// Session protocol (Mini ACP)
export type {
	MiniACPClient,
	MiniACPAgent,
	MiniACPProtocol,
	ClientProtocol,
	AgentProtocol,
	AgentCtx,
	InitializeParams,
	InitializeResult,
	ClientBinding,
	AgentBinding,
} from './protocol/index.js';

export {
	miniACPServerDescriptor,
	miniACPClientDescriptor,
} from './protocol/index.js';
export {
	createClientConnection,
	createAgentConnection,
	createSessionAdapter,
	CtxTracker,
} from './protocol/index.js';
