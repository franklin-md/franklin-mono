export * from './api/index.js';
export * from './compiler/index.js';
export * from './extension/index.js';
export * from './runtime/index.js';
export * from '../harness/orchestrator/index.js';
export * from '../harness/state/index.js';
// `combine` conflicts between compiler (combine compilers) and modules (combine modules).
// Re-export the module combine under the public alias used by the package barrel.
export type {
	BaseHarnessModule,
	HarnessModule,
	InferCompiler,
	InferAPI,
	InferState,
	InferBoundAPI,
	InferRuntime,
	CombineModules,
	CombinableModule,
	RuntimeCreateInput,
	RuntimeEntry,
	RuntimeOrchestratorPort,
	HarnessModuleCompilerContext,
	HarnessModuleCompilerInput,
} from '../harness/modules/index.js';
export type { ExtensionBundle } from '../modules/bundle/index.js';
export {
	createHarnessModuleCompilerInput,
	createRuntime,
	combine as combineModules,
	withSetup,
	modules,
} from '../harness/modules/index.js';
export { createBundle } from '../modules/bundle/index.js';
export type { ModuleBuilder } from '../harness/modules/index.js';
export type { MaybePromise } from './types/index.js';
