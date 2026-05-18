import type { Simplify } from '@franklin/lib';
import type { API } from '../../api/index.js';
import type { Compiler } from '../../compiler/index.js';
import type { Extension } from '../../extension/index.js';
import type { ExtensionPoint } from '../../extension-points/types.js';
import type { BaseExtensionModule } from './types.js';

type InferModule<T extends BaseExtensionModule> = T extends {
	readonly extensionPoint: ExtensionPoint<infer A>;
	readonly compiler: Compiler<infer CompilerAPI, infer Runtime>;
}
	? [CompilerAPI] extends [A]
		? {
				readonly signature: A;
				readonly runtime: Runtime;
			}
		: never
	: never;

export type InferSignature<T extends BaseExtensionModule> =
	InferModule<T>['signature'];

export type InferCompiler<T extends BaseExtensionModule> = Compiler<
	InferSignature<T>,
	InferModule<T>['runtime']
>;

export type InferRuntime<T extends BaseExtensionModule> =
	InferModule<T>['runtime'];

export type InferAPI<T extends BaseExtensionModule> = Simplify<
	API<InferSignature<T>, InferModule<T>['runtime']>
>;

export type InferExtension<T extends BaseExtensionModule> = Extension<
	InferAPI<T>
>;
