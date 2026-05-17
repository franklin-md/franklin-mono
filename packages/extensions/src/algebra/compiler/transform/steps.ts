import type { Signature } from '../../api/index.js';
import type { BaseRuntime } from '../../runtime/index.js';
import type { CompilerStep, CompilerTransform, RuntimeStep } from './types.js';

export function identityStep<
	Runtime extends BaseRuntime,
>(): RuntimeStep<Runtime> {
	return (runtime) => runtime;
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
	S extends Signature,
	Runtime extends BaseRuntime & S['In'],
	OutputRuntime extends BaseRuntime & S['In'],
>(
	step: CompilerStep<Runtime, OutputRuntime>,
): CompilerTransform<S, Runtime, OutputRuntime> {
	return (inner) => {
		return {
			compile: async (registry, getRuntime) => {
				const runtime = await inner.compile(registry, getRuntime);
				return step(runtime);
			},
		};
	};
}
