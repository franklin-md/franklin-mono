export type {
	CoreAPI,
	CancelHandler,
	Prompt,
	PromptHandler,
	SystemPrompt,
	SystemPromptHandler,
	ExtensionToolDefinition,
	ToolSpec,
	ToolArgs,
	ToolDefinition,
	AnyToolDefinition,
	SerializedToolDefinition,
	ToolOutput,
	ToolExecuteReturn,
} from './systems/core/api/index.js';
export { resolveToolOutput } from './systems/core/api/index.js';
export { toolSpec } from './systems/core/api/index.js';
export { serializeTool, toToolInputSchema } from './systems/core/api/index.js';
export type { DependencyRuntime } from './systems/dependency/index.js';
export type { EnvironmentAPI } from './systems/environment/api/index.js';
export type {
	Environment,
	ReconfigurableEnvironment,
	FilesystemConfig,
	NetworkConfig,
	EnvironmentConfig,
	WebAPI,
} from './systems/environment/api/index.js';
export type { ConfigureOptions } from './systems/environment/api/index.js';
export {
	DEFAULT_NETWORK_CONFIG,
	createReconfigurableEnvironment,
	configureFilesystem,
	createWeb,
} from './systems/environment/api/index.js';

export type { StoreAPI } from './systems/store/api/index.js';
export type {
	ReadonlyStore,
	Store,
	PersistedStore,
	PersistedStoreAdapter,
} from './systems/store/api/index.js';
export type { Sharing, ForkMode } from './systems/store/api/index.js';
export type { StoreKey, StoreValueType } from './systems/store/api/index.js';
export { storeKey } from './systems/store/api/index.js';
export type { StoreResult } from './systems/store/api/index.js';
export type { MapFilePersister, RestoreResult, Issue } from '@franklin/lib';
export {
	createEmptyStoreResult,
	createStoreResult,
	createStore,
	createPersistedStore,
} from './systems/store/api/index.js';
export { StoreRegistry } from './systems/store/api/index.js';
export type { StoreEntry, StoreMapping } from './systems/store/api/index.js';
export type { StoreSnapshot } from './systems/store/api/index.js';
export type {
	SessionRuntime,
	Session,
	SessionCreate,
	SessionCreateInput,
	SessionEvent,
} from './systems/sessions/api/index.js';
export {
	SessionCollection,
	SessionManager,
	createSessionManager,
} from './systems/sessions/api/index.js';
export type { BaseAPI } from './algebra/api/types.js';
export type { IdentityAPI } from './systems/identity/api.js';
export { identityAPI } from './systems/identity/api.js';
export type { Compiler } from './algebra/compiler/types.js';
export { compile, compileAll } from './algebra/compiler/compile.js';
export { combine } from './algebra/compiler/combine.js';
export type { IdentityCompiler } from './systems/identity/compiler.js';
export { identityCompiler } from './systems/identity/compiler.js';
export { createCoreCompiler } from './systems/core/compile/index.js';
export { createStoreCompiler } from './systems/store/compile/index.js';
export { createEnvironmentCompiler } from './systems/environment/compile/index.js';
export type { Extension, MaybePromise } from './algebra/types/index.js';
export type { ExtensionBundle } from './algebra/system/bundle/index.js';
export { createBundle } from './algebra/system/bundle/index.js';
export { reduceExtensions } from './algebra/types/index.js';
// ---------------------------------------------------------------------------
// Runtime system
// ---------------------------------------------------------------------------
export type { BaseState } from './algebra/state/types.js';
export type {
	BaseRuntimeSystem,
	RuntimeSystem,
	InferState,
	InferAPI,
	InferRuntime,
	CombineSystems,
	CombinableSystem,
} from './algebra/system/types.js';
export { createRuntime } from './algebra/system/create.js';
export { createCoreSystem } from './systems/core/system.js';
export type { CoreSystem } from './systems/core/system.js';
export { createStoreSystem } from './systems/store/system.js';
export type { StoreSystem } from './systems/store/system.js';
export { identitySystem } from './systems/identity/system.js';
export type { IdentitySystem } from './systems/identity/system.js';
export { createDependencySystem } from './systems/dependency/system.js';
export type { DependencySystem } from './systems/dependency/system.js';
export { createEnvironmentSystem } from './systems/environment/system.js';
export type { EnvironmentSystem } from './systems/environment/system.js';
export type { EnvironmentFactory } from './systems/environment/system.js';
export { createSessionSystem } from './systems/sessions/system.js';
export type { SessionSystem } from './systems/sessions/system.js';
export { combine as combineSystems } from './algebra/system/combine.js';
export { withSetup } from './algebra/system/setup.js';
export { systems } from './algebra/system/builder.js';
export type { SystemBuilder } from './algebra/system/builder.js';
export { resolveState } from './algebra/state/resolve.js';

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------
export type { BaseRuntime, StateHandle } from './algebra/runtime/types.js';
export type { CombinedRuntime } from './algebra/runtime/combine.js';
export type { CoreRuntime } from './systems/core/runtime/index.js';
export { inspectRuntime } from './systems/core/inspect.js';
export type { StoreRuntime } from './systems/store/runtime.js';
export type { EnvironmentRuntime } from './systems/environment/runtime.js';
export type { IdentityRuntime } from './systems/identity/runtime.js';
export { identityRuntime } from './systems/identity/runtime.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
export type { CoreState } from './systems/core/state.js';
export { emptyCoreState } from './systems/core/state.js';
export type { StoreState } from './systems/store/state.js';
export { emptyStoreState } from './systems/store/state.js';
export type { EnvironmentState } from './systems/environment/state.js';
export { emptyEnvironmentState } from './systems/environment/state.js';
export type { SessionState } from './systems/sessions/state.js';
export type { IdentityState } from './systems/identity/state.js';
export { identityState } from './systems/identity/state.js';

// ---------------------------------------------------------------------------
// Built-in extensions
// ---------------------------------------------------------------------------
export {
	conversationExtension,
	todoExtension,
	statusExtension,
	filesystemExtension,
	bashExtension,
	createWebExtension,
	spawnExtension,
	instructionsExtension,
} from './extensions/index.js';

export { createTodoControl, createStatusControl } from './extensions/index.js';

export type {
	ConversationTurn,
	AssistantTurn,
	AssistantBlock,
	TextBlock,
	ThinkingBlock,
	ToolUseBlock,
	TurnEndBlock,
} from './extensions/conversation/types.js';
export type { Todo, TodoControl } from './extensions/todo/types.js';
export type { StatusState, StatusControl } from './extensions/status/types.js';
export { DEFAULT_WEB_FETCH_OPTIONS } from './extensions/web/web-fetch/types.js';
export type {
	WebFetchProcessedResult,
	WebFetchExtensionOptions,
} from './extensions/web/web-fetch/types.js';
export { DEFAULT_WEB_SEARCH_OPTIONS } from './extensions/web/web-search/types.js';
export type {
	WebExtensionOptions,
	WebSearchExtensionOptions,
	WebSearchResult,
} from './extensions/web/index.js';
export type {
	InstructionSpec,
	InstructionsManager,
} from './extensions/instructions/types.js';
