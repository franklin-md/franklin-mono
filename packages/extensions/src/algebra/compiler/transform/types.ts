import type { API } from '../../api/index.js';
import type { BaseRuntime } from '../../runtime/index.js';
import type { MaybePromise } from '../../../utils/maybe-promise.js';
import type { Compiler } from '../types.js';

export type CompilerStep<
	InputRuntime extends BaseRuntime,
	OutputRuntime extends BaseRuntime,
> = (runtime: InputRuntime) => MaybePromise<OutputRuntime>;

export type RuntimeStep<Runtime extends BaseRuntime> = CompilerStep<
	Runtime,
	Runtime
>;

export type CompilerTransform<
	A extends API,
	InputRuntime extends BaseRuntime & A['In'],
	OutputRuntime extends BaseRuntime & A['In'],
> = (compiler: Compiler<A, InputRuntime>) => Compiler<A, OutputRuntime>;
