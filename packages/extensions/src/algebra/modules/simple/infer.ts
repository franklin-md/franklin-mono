import type { Simplify } from '@franklin/lib';
import type { BoundAPI } from '../../api/index.js';
import type { Compiler } from '../../compiler/index.js';
import type { Extension } from '../../extension/index.js';
import type { ExtensionModule } from './types.js';

type InferModule<T> =
	T extends ExtensionModule<infer A, infer Runtime>
		? {
				api: A;
				runtime: Runtime;
			}
		: never;

export type InferAPI<T> = InferModule<T>['api'];

export type InferCompiler<T> = Compiler<InferAPI<T>, InferModule<T>['runtime']>;

export type InferRuntime<T> = InferModule<T>['runtime'];

export type InferBoundAPI<T> = Simplify<
	BoundAPI<InferAPI<T>, InferModule<T>['runtime']>
>;

export type InferExtension<T> = Extension<InferBoundAPI<T>>;

