import type { Simplify } from '@franklin/lib';
import type { API } from '@franklin/extensibility';
import type { Compiler } from '@franklin/extensibility';
import type { Extension } from '@franklin/extensibility';
import type { ExtensionModule } from '@franklin/extensibility/module';
import type { BaseStateExtensionModule } from './types.js';

type InferModule<T extends BaseStateExtensionModule> = T extends {
	emptyState(): infer S;
	instantiate(state: never): ExtensionModule<infer A, infer Runtime>;
}
	? {
			readonly state: S;
			readonly signature: A;
			readonly runtime: Runtime;
		}
	: never;

export type InferState<T extends BaseStateExtensionModule> = Simplify<
	InferModule<T>['state']
>;

export type InferSignature<T extends BaseStateExtensionModule> =
	InferModule<T>['signature'];

export type InferRuntime<T extends BaseStateExtensionModule> =
	InferModule<T>['runtime'];

export type InferCompiler<T extends BaseStateExtensionModule> = Compiler<
	InferSignature<T>,
	InferRuntime<T>
>;

export type InferSimpleModule<T extends BaseStateExtensionModule> =
	ExtensionModule<InferSignature<T>, InferRuntime<T>>;

export type InferAPI<T extends BaseStateExtensionModule> = Simplify<
	API<InferSignature<T>, InferModule<T>['runtime']>
>;

export type InferExtension<T extends BaseStateExtensionModule> = Extension<
	InferAPI<T>
>;
