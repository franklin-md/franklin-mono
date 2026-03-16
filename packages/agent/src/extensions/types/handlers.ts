import type {
	ContentBlock,
	McpServer,
	SessionNotification,
} from '@agentclientprotocol/sdk';

/**
 * Waterfall — fires on new, loaded, or forked sessions.
 * `sessionId` is undefined for new sessions, present for load/fork.
 * Return modified params to transform, or undefined to pass through.
 */
export type SessionStartHandler = (ctx: {
	sessionId?: string;
	cwd: string;
	mcpServers: McpServer[];
}) => Promise<{ cwd?: string; mcpServers?: McpServer[] } | undefined>;

/**
 * Waterfall — return transformed prompt to modify, or undefined to pass through.
 */
export type PromptHandler = (ctx: {
	sessionId: string;
	prompt: ContentBlock[];
}) => Promise<{ prompt: ContentBlock[] } | undefined>;

/**
 * Notify — observe streaming output. Return value ignored.
 */
export type SessionUpdateHandler = (ctx: {
	notification: SessionNotification;
}) => Promise<void>;
