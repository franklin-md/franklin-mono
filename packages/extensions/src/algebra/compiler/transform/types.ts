import type { Signature } from '../../api/index.js';
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
	S extends Signature,
	InputRuntime extends BaseRuntime & S['In'],
	OutputRuntime extends BaseRuntime & S['In'],
> = (compiler: Compiler<S, InputRuntime>) => Compiler<S, OutputRuntime>;
