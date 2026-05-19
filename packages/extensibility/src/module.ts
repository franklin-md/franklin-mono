export type {
	BaseExtensionModule,
	CombinableModule,
	CombineModules,
	ExtensionModule,
	ExtensionModuleTransform,
	IdentityAPI,
	IdentityCompiler,
	IdentityModule,
	IdentityRuntime,
	IdentitySignature,
	InferAPI,
	InferCompiler,
	InferExtension,
	InferRuntime,
	InferSignature,
	Modules,
	ValidateModules,
} from './modules/simple/index.js';
export {
	combine,
	combineAll,
	identityAPI,
	identityCompiler,
	identityModule,
	identityRuntime,
	liftCompilerTransform,
} from './modules/simple/index.js';
export type {
	DependencyModule,
	DependencyRuntime,
} from './patterns/dependency/index.js';
export { createDependencyModule } from './patterns/dependency/index.js';
