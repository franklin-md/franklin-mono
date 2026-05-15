import type { Simplify } from '@franklin/lib';
import type { BoundAPI } from '../../api/index.js';
import type { Compiler } from '../../compiler/index.js';
import type { Extension } from '../../extension/index.js';
import type { ExtensionModule } from '../simple/index.js';
import type { StateExtensionModule } from './types.js';

type InferModule<T> =
	T extends StateExtensionModule<infer S, infer A, infer Runtime>
		? {
				state: S;
				api: A;
				runtime: Runtime;
				simple: ExtensionModule<A, Runtime>;
			}
		: never;

export type InferState<T> = Simplify<InferModule<T>['state']>;

export type InferAPI<T> = InferModule<T>['api'];

export type InferRuntime<T> = InferModule<T>['runtime'];

export type InferCompiler<T> = Compiler<InferAPI<T>, InferRuntime<T>>;

export type InferSimpleModule<T> = InferModule<T>['simple'];

export type InferBoundAPI<T> = Simplify<
	BoundAPI<InferAPI<T>, InferModule<T>['runtime']>
>;

export type InferExtension<T> = Extension<InferBoundAPI<T>>;
