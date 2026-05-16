import type { Signature } from '../api/index.js';
import type { BaseRuntime } from '../runtime/index.js';
import type { Compiler } from './types.js';

export type CompilerStep<
	InputRuntime extends BaseRuntime,
	OutputRuntime extends BaseRuntime,
> = (runtime: InputRuntime) => Promise<OutputRuntime>;

export type RuntimeStep<Runtime extends BaseRuntime> = CompilerStep<
	Runtime,
	Runtime
>;

export function composeCompilerSteps<
	InputRuntime extends BaseRuntime,
	MiddleRuntime extends BaseRuntime,
	OutputRuntime extends BaseRuntime,
>(
	first: CompilerStep<InputRuntime, MiddleRuntime>,
	second: CompilerStep<MiddleRuntime, OutputRuntime>,
): CompilerStep<InputRuntime, OutputRuntime> {
	return async (runtime) => second(await first(runtime));
}

export function transformCompiler<
	S extends Signature,
	Runtime extends BaseRuntime & S['In'],
	OutputRuntime extends BaseRuntime & S['In'],
>(
	inner: Compiler<S, Runtime>,
	step: CompilerStep<Runtime, OutputRuntime>,
): Compiler<S, OutputRuntime> {
	return {
		compile: async (registry, getRuntime) => {
			const runtime = await inner.compile(registry, getRuntime);
			return step(runtime);
		},
	};
}

export function withSetupCompiler<
	S extends Signature,
	Runtime extends BaseRuntime & S['In'],
>(
	inner: Compiler<S, Runtime>,
	setup: (runtime: Runtime) => Promise<void>,
): Compiler<S, Runtime> {
	return transformCompiler(inner, async (runtime) => {
		await setup(runtime);
		return runtime;
	});
}
