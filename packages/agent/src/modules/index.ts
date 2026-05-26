// Core
export type {
	CoreAPI,
	CoreEventHandlers,
	CoreSignature,
	Prompt,
	PromptHandler,
	SetPartOptions,
	SystemPrompt,
	SystemPromptContent,
	SystemPromptHandler,
	ToolArgsOf,
	ToolCallEvent,
	RenderedToolOutput,
	ToolOutputOf,
	ToolResultEvent,
	ToolSpec,
} from './core/api/index.js';
export { toolSpec } from './core/api/index.js';
export { inspectRuntime } from './core/inspect.js';
export type { CoreModule } from './core/module/types.js';
export { createCoreStateModule } from './core/module/index.js';
export type {
	CoreEvent,
	CoreInspectDump,
	CoreRuntime,
	ToolRegistry,
} from './core/runtime/index.js';
export type { CoreState, SessionSnapshot, ToolFilter } from './core/state.js';
export { emptyCoreState, emptySessionSnapshot } from './core/state.js';

// Auth dependency
export type {
	AuthDependencyModule,
	AuthDependencyRuntime,
} from '../auth/dependency.js';

// State modules
export {
	buildStateExtensionModule,
	combine as combineStateModules,
	combineAll as combineAllStateModules,
	defineExtension,
	fromSimpleModule,
	identityState,
	identityStateHandle,
	liftBuildModule,
	liftCompilerTransform as liftStateCompilerTransform,
	liftModuleTransform as liftStateModuleTransform,
	resolveState,
} from './state/index.js';
export type {
	BaseState,
	BaseStateExtensionModule,
	BuildableModule,
	BuildModules,
	CombinableBuildModule,
	CombinableModule as CombinableStateModule,
	CombineModules as CombineStateModules,
	ExtensionAPI as ExtensionAPIForModules,
	ExtensionForModules,
	IdentityModule as IdentityStateModule,
	IdentityState,
	InferAPI as InferStateModuleAPI,
	InferCompiler as InferStateModuleCompiler,
	InferExtension as InferStateModuleExtension,
	InferRuntime as InferStateModuleRuntime,
	InferSignature as InferStateModuleSignature,
	InferSimpleModule,
	InferState,
	LiftModule,
	LiftModules,
	ModuleRuntimes,
	ModuleSignatures,
	Modules as StateModules,
	StateCompilerTransform,
	StateExtensionModule,
	StateExtensionModuleTransform,
	StateHandle,
	StateModuleTransform,
	ValidateBuildModules,
	ValidateModules as ValidateStateModules,
} from './state/index.js';

// Environment
export type {
	ConfigureOptions,
	Environment,
	EnvironmentConfig,
	FilesystemConfig,
	ReconfigurableEnvironment,
} from './environment/api/index.js';
export {
	configureFilesystem,
	createReconfigurableEnvironment,
	createWeb,
	DEFAULT_NETWORK_CONFIG,
} from './environment/api/index.js';
export { createEnvironmentCompiler } from './environment/compile/index.js';
export type {
	EnvironmentFactory,
	EnvironmentModule,
} from './environment/module.js';
export { createEnvironmentModule } from './environment/module.js';
export type {
	EnvironmentEvent,
	EnvironmentRuntime,
} from './environment/runtime.js';
export type { EnvironmentState } from './environment/state.js';
export { emptyEnvironmentState } from './environment/state.js';

// References
export type {
	Reference,
	ReferenceContext,
	ReferenceEngine,
	ReferenceHandler,
	ReferenceHandlerRuntime,
	ReferencesAPI,
	ReferencesModule,
	ReferencesSignature,
} from './references/index.js';
export {
	createReferencesModule,
	referenceContextsToContent,
	referenceContextToContent,
} from './references/index.js';

// Store
export type {
	ForkMode,
	PersistedStore,
	PersistedStoreAdapter,
	ReadonlyStore,
	Sharing,
	Store,
	StoreAPI,
	StoreEntry,
	StoreKey,
	StoreMapping,
	StoreResult,
	StoreSignature,
	StoreSnapshot,
	StoreValueType,
} from './store/api/index.js';
export {
	createEmptyStoreResult,
	createPersistedStore,
	createStore,
	createStoreResult,
	StoreRegistry,
	storeKey,
} from './store/api/index.js';
export { createStoreCompiler } from './store/compile/index.js';
export type { StoreModule } from './store/module.js';
export { createStoreModule } from './store/module.js';
export type { StoreRuntime } from './store/runtime.js';
export type { StoreStateModule } from './store/state-module.js';
export { createStoreStateModule } from './store/state-module.js';
export type { StoreState } from './store/state.js';
export { emptyStoreState } from './store/state.js';

// Orchestrator
export { createOrchestrator, Orchestrator } from './orchestrator/index.js';
export type {
	CreateOrchestratorInput,
	OrchestratorCreateInput,
	OrchestratorHandle,
	OrchestratorModule,
	OrchestratorRuntime,
	OrchestratorState,
	RuntimeEntry,
	RuntimeEvent,
} from './orchestrator/index.js';
