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
export { computeToolStatus } from './conversation/status.js';
export {
	createToolRendererRegistry,
	resolveToolRenderer,
} from './conversation/registry.js';
export { createToolUseBlock } from './conversation/tool-use.js';
export type {
	ToolStatus,
	ToolRenderProps,
	ToolRendererEntry,
	ToolRendererRegistry,
	ResolvedToolRender,
	BlockComponents,
} from './conversation/types.js';
