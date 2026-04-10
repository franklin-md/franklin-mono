export { createSimpleContext } from './utils/create-simple-context.js';
export { useStore } from './utils/use-store.js';
export { AgentProvider, useAgent } from './agent/agent-context.js';
export {
	AppContext,
	FranklinProvider,
	useApp,
} from './agent/franklin-context.js';
export { useAgentState } from './agent/use-agent-state.js';
export { useSessions } from './agent/use-sessions.js';
export { useSettings } from './agent/use-settings.js';
export {
	useModelSelection,
	type UseModelSelection,
} from './agent/use-model-selection.js';
export {
	useThinkingLevel,
	type UseThinkingLevel,
} from './agent/use-thinking-level.js';
export { useMergeRefs } from './utils/use-merge-refs.js';
export {
	useTextareaAutosizeLayout,
	type TextareaAutosizeHeightMeta,
	type UseTextareaAutosizeLayoutOptions,
	type UseTextareaAutosizeLayoutResult,
} from './dom/use-textarea-autosize-layout.js';
export { PromptProvider, usePrompt } from './prompt/context.js';
export type { PromptContextValue } from './prompt/context.js';
export { Prompt } from './prompt/prompt.js';
export { PromptControls } from './prompt/controls.js';
export { PromptText } from './prompt/text.js';
export { PromptSend } from './prompt/send.js';
export { PromptCancel } from './prompt/cancel.js';
export { PromptAgentControl } from './prompt/agent-control.js';
export type { PromptAgentControlProps } from './prompt/agent-control.js';

// ---------------------------------------------------------------------------
// Conversation — headless turn/block rendering
// ---------------------------------------------------------------------------
export { Conversation } from './conversation/conversation.js';
export type { ConversationComponents } from './conversation/types.js';
export { useConversationTurns } from './conversation/use-conversation-turns.js';

// ---------------------------------------------------------------------------
// Conversation / Tools — renderer registry and status
// ---------------------------------------------------------------------------
export { computeToolStatus } from './conversation/tools/status.js';
export {
	createToolRenderer,
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
	ToolRendererBinding,
	ToolRendererEntry,
	ToolRendererRegistryEntries,
	ToolRendererRegistry,
	ResolvedToolRender,
} from './conversation/tools/types.js';

// ---------------------------------------------------------------------------
// Conversation / TurnEnd — renderer registry
// ---------------------------------------------------------------------------
export { resolveTurnEndRenderer } from './conversation/turn-end/registry.js';
export {
	TurnEndBlock,
	createTurnEndBlock,
} from './conversation/turn-end/turn-end.js';
export type {
	TurnEndRenderer,
	TurnEndRendererRegistry,
} from './conversation/turn-end/types.js';

// ---------------------------------------------------------------------------
// Icons — AI provider and model brand icons (sourced from lobehub/lobe-icons)
// ---------------------------------------------------------------------------
export type { IconProps } from './icons/types.js';
export { Icons } from './icons/registry.js';
