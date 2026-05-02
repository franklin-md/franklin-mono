import type { Simplify } from '@franklin/lib';
import type { API, BoundAPI } from '../../algebra/api/index.js';
import type { Compiler } from '../../algebra/compiler/index.js';
import type { BaseRuntime } from '../../algebra/runtime/index.js';
import type { BaseState } from '../state/index.js';
import type { HarnessModule } from './module.js';
import type { Extension } from '../../algebra/extension/index.js';

type InferModule<T> =
	T extends HarnessModule<
		infer S extends BaseState,
		infer A extends API,
		infer Runtime
	>
		? Runtime extends BaseRuntime
			? {
					state: S;
					api: A;
					runtime: Runtime;
				}
			: never
		: T extends BaseRuntime
			? {
					state: never;
					api: never;
					runtime: T;
				}
			: never;

export type InferAPI<T> = InferModule<T>['api'];

export type InferCompiler<T> = Compiler<InferAPI<T>, InferModule<T>['runtime']>;

export type InferState<T> = Simplify<InferModule<T>['state']>;

export type InferBoundAPI<T> = Simplify<
	BoundAPI<InferAPI<T>, InferModule<T>['runtime']>
>;

export type InferExtension<T> = Extension<InferBoundAPI<T>>;

export type InferRuntime<T> = InferModule<T>['runtime'];
