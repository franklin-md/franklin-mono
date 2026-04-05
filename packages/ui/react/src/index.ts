export { createSimpleContext } from './create-simple-context.js';
export { useStore } from './use-store.js';
export { AgentProvider, useAgent } from './agent-context.js';
export { useAgentState } from './use-agent-state.js';
export { FranklinProvider, useApp } from './franklin-context.js';
export { useSessions } from './use-sessions.js';

// ---------------------------------------------------------------------------
// Conversation — headless turn/block rendering
// ---------------------------------------------------------------------------
export { Conversation } from './conversation/conversation.js';
export type { ConversationComponents } from './conversation/types.js';

// ---------------------------------------------------------------------------
// Conversation / Tools — renderer registry and status
// ---------------------------------------------------------------------------
export { computeToolStatus } from './conversation/tools/status.js';
export {
	createToolRendererRegistry,
	resolveToolRenderer,
} from './conversation/tools/registry.js';
export {
	ToolUseBlock,
	createToolUseBlock,
} from './conversation/tools/tool-use.js';
export type {
	ToolStatus,
	ToolRenderProps,
	ToolRendererEntry,
	ToolRendererRegistry,
	ResolvedToolRender,
} from './conversation/tools/types.js';
