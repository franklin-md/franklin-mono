import type { Simplify } from '@franklin/lib';
import type { BoundAPI } from '../../api/index.js';
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
				readonly api: A;
				readonly runtime: Runtime;
			}
		: never
	: never;

export type InferAPI<T extends BaseExtensionModule> = InferModule<T>['api'];

export type InferCompiler<T extends BaseExtensionModule> = Compiler<
	InferAPI<T>,
	InferModule<T>['runtime']
>;

export type InferRuntime<T extends BaseExtensionModule> =
	InferModule<T>['runtime'];

export type InferBoundAPI<T extends BaseExtensionModule> = Simplify<
	BoundAPI<InferAPI<T>, InferModule<T>['runtime']>
>;

export type InferExtension<T extends BaseExtensionModule> = Extension<
	InferBoundAPI<T>
>;
