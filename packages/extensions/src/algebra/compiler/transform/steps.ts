import type { API } from '../../api/index.js';
import type { BaseRuntime } from '../../runtime/index.js';
import type { Compiler } from '../types.js';

export type CompilerStep<
	InputRuntime extends BaseRuntime,
	OutputRuntime extends BaseRuntime,
> = (runtime: InputRuntime) => Promise<OutputRuntime>;

export type RuntimeStep<Runtime extends BaseRuntime> = CompilerStep<
	Runtime,
	Runtime
>;

export type CompilerTransform<
	A extends API,
	InputRuntime extends BaseRuntime & A['In'],
	OutputRuntime extends BaseRuntime & A['In'],
> = (compiler: Compiler<A, InputRuntime>) => Compiler<A, OutputRuntime>;

export function identityStep<
	Runtime extends BaseRuntime,
>(): RuntimeStep<Runtime> {
	return async (runtime) => runtime;
}

export function composeSteps<
	InputRuntime extends BaseRuntime,
	MiddleRuntime extends BaseRuntime,
	OutputRuntime extends BaseRuntime,
>(
	first: CompilerStep<InputRuntime, MiddleRuntime>,
	second: CompilerStep<MiddleRuntime, OutputRuntime>,
): CompilerStep<InputRuntime, OutputRuntime> {
	return async (runtime) => second(await first(runtime));
}

export function reduceSteps<Runtime extends BaseRuntime>(
	steps: readonly RuntimeStep<Runtime>[],
): RuntimeStep<Runtime> {
	return steps.reduce(
		(acc, step) => composeSteps(acc, step),
		identityStep<Runtime>(),
	);
}

export function applyStep<
	A extends API,
	Runtime extends BaseRuntime & A['In'],
	OutputRuntime extends BaseRuntime & A['In'],
>(
	step: CompilerStep<Runtime, OutputRuntime>,
): CompilerTransform<A, Runtime, OutputRuntime> {
	return (inner) => {
		return {
			compile: async (registry, getRuntime) => {
				const runtime = await inner.compile(registry, getRuntime);
				return step(runtime);
			},
		};
	};
}
