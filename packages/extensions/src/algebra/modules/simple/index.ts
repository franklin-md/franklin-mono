export type { BaseExtensionModule, ExtensionModule } from './types.js';
export type {
	InferAPI,
	InferCompiler,
	InferExtension,
	InferRuntime,
	InferSignature,
} from './infer.js';
export type {
	CombinableModule,
	CombineModules,
	Modules,
	ValidateModules,
} from './combine.js';
export { combine, combineAll } from './combine.js';
export type {
	IdentityAPI,
	IdentitySignature,
	IdentityCompiler,
	IdentityModule,
	IdentityRuntime,
} from './identity.js';
export {
	identityAPI,
	identityCompiler,
	identityModule,
	identityRuntime,
} from './identity.js';
export { withSetup } from './setup.js';
