export type { Issue, MapFilePersister, RestoreResult } from '@franklin/lib';
export type {
	API,
	CombineSignature,
	BaseAPI,
	Signature,
	StaticSignature,
} from './algebra/api/types.js';
export { combine } from './algebra/compiler/combine.js';
export { compile } from './algebra/compiler/compile.js';
export type { Compiler } from './algebra/compiler/types.js';
export type {
	CompilerStep,
	CompilerTransform,
	RuntimeStep,
} from './algebra/compiler/transform/index.js';
export {
	applyStep,
	composeSteps,
	identityStep,
	reduceSteps,
} from './algebra/compiler/transform/index.js';
export type { Registry } from './algebra/extension-points/registry.js';
export type { ExtensionPoint } from './algebra/extension-points/types.js';
export { createExtensionPoint } from './algebra/extension-points/create.js';
export type { RegistryView } from './algebra/extension-points/view.js';
export {
	createOrchestrator,
	Orchestrator,
	RuntimeCollection,
} from './modules/orchestrator/index.js';
export type {
	CreateOrchestratorInput,
	OrchestratorCreateInput,
	OrchestratorHandle,
	OrchestratorModule,
	OrchestratorRuntime,
	RuntimeEntry,
	RuntimeEvent,
	SelfRuntime,
} from './modules/orchestrator/index.js';
export type { CombinedRuntime } from './algebra/runtime/combine.js';
export type { ReduceRuntimes } from './algebra/runtime/reduce.js';
export type {
	BaseExtensionModule,
	ExtensionModule,
} from './algebra/modules/simple/index.js';
export type {
	BaseStateExtensionModule,
	StateExtensionModule,
} from './algebra/modules/state/index.js';
export {
	buildStateExtensionModule,
	combine as combineModules,
	combineAll,
	fromSimpleModule,
	liftCompilerTransform as liftStateCompilerTransform,
	liftModuleTransform as liftStateModuleTransform,
} from './algebra/modules/state/index.js';
// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------
export type { BaseRuntime } from './algebra/runtime/types.js';
export { resolveState } from './algebra/modules/state/index.js';
// ---------------------------------------------------------------------------
// Extension authoring
// ---------------------------------------------------------------------------
export type { BaseState, StateHandle } from './algebra/modules/state/index.js';
export type { ExtensionBundle } from './modules/bundle/index.js';
export { createBundle } from './modules/bundle/index.js';
export { defineExtension } from './algebra/extension/index.js';
export type {
	AlgebraExtensionAPI,
	ExtensionAPI,
	ExtensionForModules,
	ModuleSignatures,
	ModuleRuntimes,
} from './algebra/extension/index.js';
export type {
	BuildableModule,
	BuildModules,
	CombinableModule,
	CombinableBuildModule,
	CombineModules,
	InferAPI,
	InferRuntime,
	InferSignature,
	InferState,
	LiftModule,
	LiftModules,
	Modules,
	ValidateBuildModules,
	ValidateModules,
} from './algebra/modules/state/index.js';
export type { Extension, ExtensionFor } from './algebra/extension/types.js';
export { reduceExtensions } from './algebra/extension/index.js';
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
	createFilesystemExtension,
	createReadPDFExtension,
	createStatusControl,
	createTodoControl,
	createWebExtension,
	environmentInfoExtension,
	filesystemExtension,
	FreePDFConverter,
	instructionsExtension,
	MistralPDFConverter,
	type PDFInput,
	spawnExtension,
	statusExtension,
	todoExtension,
} from './extensions/index.js';
export type { PDFConverter } from './extensions/index.js';
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
	CoreEventHandlers,
	CoreOnRegistration,
	CoreRegisterToolRegistration,
	CoreSignature,
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
export type { CoreEvent, CoreRuntime } from './modules/core/runtime/index.js';
export { CORE_STATE, coreStateHandle } from './modules/core/runtime/index.js';
// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
export type { CoreState, SessionSnapshot } from './modules/core/state.js';
export { emptyCoreState, emptySessionSnapshot } from './modules/core/state.js';
export type { CoreModule, CoreStateModule } from './modules/core/module.js';
export {
	createCoreModule,
	createCoreStateModule,
} from './modules/core/module.js';
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
export type {
	EnvironmentEvent,
	EnvironmentRuntime,
} from './modules/environment/runtime.js';
export {
	ENV_STATE,
	environmentStateHandle,
} from './modules/environment/runtime.js';
export type { EnvironmentState } from './modules/environment/state.js';
export { emptyEnvironmentState } from './modules/environment/state.js';
export type {
	EnvironmentFactory,
	EnvironmentModule,
} from './modules/environment/module.js';
export { createEnvironmentModule } from './modules/environment/module.js';
export type {
	ForkMode,
	PersistedStore,
	PersistedStoreAdapter,
	ReadonlyStore,
	Sharing,
	Store,
	StoreAPI,
	StoreSignature,
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
export { STORE_MAPPING, storeMappingHandle } from './modules/store/runtime.js';
export type { StoreState } from './modules/store/state.js';
export { emptyStoreState } from './modules/store/state.js';
export type { StoreModule } from './modules/store/module.js';
export { createStoreModule } from './modules/store/module.js';
export type { StoreStateModule } from './modules/store/state-module.js';
export {
	createStoreStateModule,
	storeStateHandle,
} from './modules/store/state-module.js';
