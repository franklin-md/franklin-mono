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
export {
	createOrchestrator,
	Orchestrator,
	RuntimeCollection,
} from './harness/orchestrator/index.js';
export type {
	OrchestratedAPI,
	OrchestratedExtension,
	OrchestratedRuntime,
	OrchestratorOptions,
	OrchestratorRuntime,
	RuntimeEvent,
	SelfRuntime,
} from './harness/orchestrator/index.js';
export type {
	OrchestratorCreateInput,
	OrchestratorHandle,
	RuntimeEntry,
} from './harness/modules/context.js';
export type { CombinedRuntime } from './algebra/runtime/combine.js';
export type { ReduceRuntimes } from './algebra/runtime/reduce.js';
// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------
export type { BaseRuntime, StateHandle } from './algebra/runtime/types.js';
export { resolveState } from './harness/state/resolve.js';
// ---------------------------------------------------------------------------
// Harness modules
// ---------------------------------------------------------------------------
export type { BaseState } from './harness/state/types.js';
export type { ModuleBuilder } from './harness/modules/builder.js';
export { modules } from './harness/modules/builder.js';
export type { ExtensionBundle } from './modules/bundle/index.js';
export { createBundle } from './modules/bundle/index.js';
export { combine as combineModules } from './harness/modules/combine.js';
export { createRuntime } from './harness/modules/create.js';
export { withSetup } from './harness/modules/setup.js';
export type {
	BaseHarnessModule,
	CombinableModule,
	CombineModules,
	InferAPI,
	InferBoundAPI,
	InferRuntime,
	InferState,
	HarnessModule,
} from './harness/modules/types.js';
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
} from './modules/core/api/index.js';
export {
	resolveToolOutput,
	serializeTool,
	toolSpec,
	toToolInputSchema,
} from './modules/core/api/index.js';
export { createCoreCompiler } from './modules/core/compile/index.js';
export { inspectRuntime } from './modules/core/inspect.js';
export type { CoreRuntime } from './modules/core/runtime/index.js';
export { CORE_STATE, coreStateHandle } from './modules/core/runtime/index.js';
// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
export type { CoreState } from './modules/core/state.js';
export { emptyCoreState } from './modules/core/state.js';
export type { CoreModule } from './modules/core/module.js';
export { createCoreModule } from './modules/core/module.js';
export type { DependencyRuntime } from './modules/dependency/index.js';
export type { DependencyModule } from './modules/dependency/module.js';
export { createDependencyModule } from './modules/dependency/module.js';
export type {
	ConfigureOptions,
	Environment,
	EnvironmentConfig,
	FilesystemConfig,
	ReconfigurableEnvironment,
} from './modules/environment/api/index.js';
export {
	configureFilesystem,
	createReconfigurableEnvironment,
	createWeb,
	DEFAULT_NETWORK_CONFIG,
} from './modules/environment/api/index.js';
export { createEnvironmentCompiler } from './modules/environment/compile/index.js';
export type { EnvironmentRuntime } from './modules/environment/runtime.js';
export { environmentStateHandle } from './modules/environment/runtime.js';
export type { EnvironmentState } from './modules/environment/state.js';
export { emptyEnvironmentState } from './modules/environment/state.js';
export type {
	EnvironmentFactory,
	EnvironmentModule,
} from './modules/environment/module.js';
export { createEnvironmentModule } from './modules/environment/module.js';
export type {
	IdentityAPI,
	IdentityAPISurface,
} from './modules/identity/api.js';
export { identityAPI } from './modules/identity/api.js';
export type { IdentityCompiler } from './modules/identity/compiler.js';
export { identityCompiler } from './modules/identity/compiler.js';
export type { IdentityRuntime } from './modules/identity/runtime.js';
export {
	identityRuntime,
	identityStateHandle,
} from './modules/identity/runtime.js';
export type { IdentityState } from './modules/identity/state.js';
export { identityState } from './modules/identity/state.js';
export type { IdentityModule } from './modules/identity/module.js';
export { identityModule } from './modules/identity/module.js';
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
} from './modules/store/api/index.js';
export {
	createEmptyStoreResult,
	createPersistedStore,
	createStore,
	createStoreResult,
	StoreRegistry,
	storeKey,
} from './modules/store/api/index.js';
export { createStoreCompiler } from './modules/store/compile/index.js';
export type { StoreRuntime } from './modules/store/runtime.js';
export { storeStateHandle } from './modules/store/runtime.js';
export type { StoreState } from './modules/store/state.js';
export { emptyStoreState } from './modules/store/state.js';
export type { StoreModule } from './modules/store/module.js';
export { createStoreModule } from './modules/store/module.js';
