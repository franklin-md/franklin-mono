export { useAsync } from './utils/use-async.js';
export { createSimpleContext } from './utils/create-simple-context.js';
export { useFirstMountEffect } from './utils/use-first-mount-effect.js';
export { useElapsed } from './utils/use-elapsed.js';
export { useCopyFeedback } from './utils/use-copy-feedback.js';
export { useStore } from './utils/use-store.js';
export { useStableExternalStore } from './utils/use-stable-external-store.js';
export { useCollectionNavigator } from './utils/use-collection-navigator.js';
export { AgentProvider, useAgent } from './agent/agent-context.js';
export {
	AppContext,
	FranklinProvider,
	useApp,
} from './agent/franklin-context.js';
export { useAgentState } from './agent/use-agent-state.js';
export { useSessions } from './agent/use-sessions.js';
export {
	AgentsProvider,
	AgentsValueProvider,
	useAgents,
	type AgentCreate,
	type AgentCreateInput,
	type AgentsControl,
} from './agent/agents-context.js';
export {
	AgentList,
	type AgentListComponents,
	type AgentItemProps,
} from './agent/agent-list.js';
export { useAgentControl } from './agent/use-agent-control.js';
export { useAutoMarkRead } from './agent/use-auto-mark-read.js';
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
export {
	useAutoFollow,
	type AutoFollow,
	type UseAutoFollowOptions,
} from './dom/scrollable/use-auto-follow.js';
export {
	useMiddleButtonEffect,
	type MiddleButtonEffect,
} from './dom/use-middle-button-effect.js';
export {
	useTriggerOnChange,
	type UseTriggerOnChange,
	type UseTriggerOnChangeOptions,
} from './utils/use-trigger-on-change.js';
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
export { getConversationTurnEnd } from './conversation/turn-info/get-turn-end.js';
export { getConversationTurnPhase } from './conversation/turn-info/get-phase.js';
export { getConversationTurnTiming } from './conversation/turn-info/get-timing.js';
export { getConversationRenderTurn } from './conversation/turn-info/get-turn.js';
export { getConversationRenderTurns } from './conversation/turn-info/get-turns.js';
export { getLastConversationRenderTurn } from './conversation/turn-info/get-last-turn.js';
export type {
	ConversationRenderTurn,
	ConversationTurnPhase,
	ConversationTurnTiming,
} from './conversation/turn-info/types.js';

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
// Auth — hooks over the AuthManager surface from @franklin/agent
// ---------------------------------------------------------------------------
export { useAuthManager } from './auth/use-auth-manager.js';
export {
	useAuthEntries,
	type ApiKeyAuthEntry,
} from './auth/use-auth-entries.js';
export { useOAuthLogin, type OAuthLoginState } from './auth/use-oauth-login.js';

// ---------------------------------------------------------------------------
// Icons — AI provider and model brand icons (sourced from lobehub/lobe-icons)
// ---------------------------------------------------------------------------
export type { IconProps } from './icons/types.js';
export { Icons } from './icons/registry.js';
