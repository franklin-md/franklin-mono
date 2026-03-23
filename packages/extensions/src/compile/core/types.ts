import type { Extension } from '../../types/extension.js';

export type Compiler<TApi, TResult> = (
	extension: Extension<TApi>,
) => Promise<TResult>;

export type CompilerTransform<TAddedApi, TAddedResult> = <TApi, TResult>(
	compile: Compiler<TApi, TResult>,
) => Compiler<TApi & TAddedApi, TResult & TAddedResult>;
