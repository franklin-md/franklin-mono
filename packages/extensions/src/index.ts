export type { Issue, MapFilePersister, RestoreResult } from '@franklin/lib';
export type {
	API,
	BaseAPI,
	BoundAPI,
	ComposeAPI,
	StaticAPI,
} from './algebra/api/types.js';
export type { ReduceAPIs } from './algebra/api/reduce.js';
export { combine } from './algebra/compiler/combine.js';
export { compile, compileAll } from './algebra/compiler/compile.js';
export { compilerFromApi } from './algebra/compiler/from-api.js';
export type { Compiler } from './algebra/compiler/types.js';
export type { CombinedRuntime } from './algebra/runtime/combine.js';
export type { ReduceRuntimes } from './algebra/runtime/reduce.js';
// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------
export type { BaseRuntime, StateHandle } from './algebra/runtime/types.js';
export { resolveState } from './algebra/state/resolve.js';
// ---------------------------------------------------------------------------
// Runtime system
// ---------------------------------------------------------------------------
export type { BaseState } from './algebra/state/types.js';
export type { SystemBuilder } from './algebra/system/builder.js';
export { systems } from './algebra/system/builder.js';
export type { ExtensionBundle } from './algebra/system/bundle/index.js';
export { createBundle } from './algebra/system/bundle/index.js';
export { combine as combineSystems } from './algebra/system/combine.js';
export { createRuntime } from './algebra/system/create.js';
export { withSetup } from './algebra/system/setup.js';
export type {
	BaseRuntimeSystem,
	CombinableSystem,
	CombineSystems,
	InferAPI,
	InferBoundAPI,
	InferRuntime,
	InferState,
	RuntimeSystem,
} from './algebra/system/types.js';
export type {
	Extension,
	ExtensionAPISurface,
	ExtensionFor,
} from './algebra/extension/types.js';
export {
	createExtension,
	reduceExtensions,
} from './algebra/extension/index.js';
export type { MaybePromise } from './algebra/types/shared.js';
export type {
	AssistantBlock,
	AssistantTurn,
	ConversationTurn,
	TextBlock,
	ThinkingBlock,
	ToolUseBlock,
	TurnEndBlock,
} from './extensions/conversation/types.js';
// ---------------------------------------------------------------------------
// Built-in extensions
// ---------------------------------------------------------------------------
export {
	bashExtension,
	conversationExtension,
	createStatusControl,
	createTodoControl,
	createWebExtension,
	environmentInfoExtension,
	filesystemExtension,
	instructionsExtension,
	spawnExtension,
	statusExtension,
	todoExtension,
} from './extensions/index.js';
export type {
	InstructionSpec,
	InstructionsManager,
} from './extensions/instructions/types.js';
export type { StatusControl, StatusState } from './extensions/status/types.js';
export type { Todo, TodoControl } from './extensions/todo/types.js';
export type {
	WebExtensionOptions,
	WebSearchExtensionOptions,
	WebSearchResult,
} from './extensions/web/index.js';
export type {
	WebFetchExtensionOptions,
	WebFetchProcessedResult,
} from './extensions/web/web-fetch/types.js';
export { DEFAULT_WEB_FETCH_OPTIONS } from './extensions/web/web-fetch/types.js';
export { DEFAULT_WEB_SEARCH_OPTIONS } from './extensions/web/web-search/types.js';
export type {
	AnyToolDefinition,
	CancelHandler,
	CoreAPI,
	ExtensionToolDefinition,
	Prompt,
	PromptHandler,
	SerializedToolDefinition,
	SetPartOptions,
	SystemPrompt,
	SystemPromptContent,
	SystemPromptHandler,
	ToolArgs,
	ToolDefinition,
	ToolExecuteReturn,
	ToolOutput,
	ToolSpec,
} from './systems/core/api/index.js';
export {
	resolveToolOutput,
	serializeTool,
	toolSpec,
	toToolInputSchema,
} from './systems/core/api/index.js';
export { createCoreCompiler } from './systems/core/compile/index.js';
export { inspectRuntime } from './systems/core/inspect.js';
export type { CoreRuntime } from './systems/core/runtime/index.js';
export { CORE_STATE, coreStateHandle } from './systems/core/runtime/index.js';
// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
export type { CoreState } from './systems/core/state.js';
export { emptyCoreState } from './systems/core/state.js';
export type { CoreSystem } from './systems/core/system.js';
export { createCoreSystem } from './systems/core/system.js';
export type { DependencyRuntime } from './systems/dependency/index.js';
export type { DependencySystem } from './systems/dependency/system.js';
export { createDependencySystem } from './systems/dependency/system.js';
export type {
	ConfigureOptions,
	Environment,
	EnvironmentAPI,
	EnvironmentAPISurface,
	EnvironmentConfig,
	FilesystemConfig,
	ReconfigurableEnvironment,
} from './systems/environment/api/index.js';
export {
	configureFilesystem,
	createReconfigurableEnvironment,
	createWeb,
	DEFAULT_NETWORK_CONFIG,
} from './systems/environment/api/index.js';
export { createEnvironmentCompiler } from './systems/environment/compile/index.js';
export type { EnvironmentRuntime } from './systems/environment/runtime.js';
export { environmentStateHandle } from './systems/environment/runtime.js';
export type { EnvironmentState } from './systems/environment/state.js';
export { emptyEnvironmentState } from './systems/environment/state.js';
export type {
	EnvironmentFactory,
	EnvironmentSystem,
} from './systems/environment/system.js';
export { createEnvironmentSystem } from './systems/environment/system.js';
export type {
	IdentityAPI,
	IdentityAPISurface,
} from './systems/identity/api.js';
export { identityAPI } from './systems/identity/api.js';
export type { IdentityCompiler } from './systems/identity/compiler.js';
export { identityCompiler } from './systems/identity/compiler.js';
export type { IdentityRuntime } from './systems/identity/runtime.js';
export {
	identityRuntime,
	identityStateHandle,
} from './systems/identity/runtime.js';
export type { IdentityState } from './systems/identity/state.js';
export { identityState } from './systems/identity/state.js';
export type { IdentitySystem } from './systems/identity/system.js';
export { identitySystem } from './systems/identity/system.js';
export type {
	Session,
	SessionCreate,
	SessionCreateInput,
	SessionEvent,
	SessionRuntime,
} from './systems/sessions/api/index.js';
export {
	createSessionManager,
	SessionCollection,
	SessionManager,
} from './systems/sessions/api/index.js';
export type { SessionState } from './systems/sessions/state.js';
export type { SessionSystem } from './systems/sessions/system.js';
export { createSessionSystem } from './systems/sessions/system.js';
export type {
	ForkMode,
	PersistedStore,
	PersistedStoreAdapter,
	ReadonlyStore,
	Sharing,
	Store,
	StoreAPI,
	StoreAPISurface,
	StoreEntry,
	StoreKey,
	StoreMapping,
	StoreResult,
	StoreSnapshot,
	StoreValueType,
} from './systems/store/api/index.js';
export {
	createEmptyStoreResult,
	createPersistedStore,
	createStore,
	createStoreResult,
	StoreRegistry,
	storeKey,
} from './systems/store/api/index.js';
export { createStoreCompiler } from './systems/store/compile/index.js';
export type { StoreRuntime } from './systems/store/runtime.js';
export { storeStateHandle } from './systems/store/runtime.js';
export type { StoreState } from './systems/store/state.js';
export { emptyStoreState } from './systems/store/state.js';
export type { StoreSystem } from './systems/store/system.js';
export { createStoreSystem } from './systems/store/system.js';
