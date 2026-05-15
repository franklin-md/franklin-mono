import {
	reduceExtensions,
	type Extension,
} from '../../algebra/extension/index.js';
import { compile } from '../../algebra/index.js';
import type {
	InferBoundAPI,
	InferRuntime,
	InferState,
} from '../../algebra/modules/state/index.js';
import type { BaseHarnessModule } from './module.js';

export async function createRuntime<Module extends BaseHarnessModule>(
	module: Module,
	state: InferState<Module>,
	extensions: Extension<InferBoundAPI<Module>>[],
): Promise<InferRuntime<Module>> {
	const simple = module.instantiate(state);
	const extension = reduceExtensions(...extensions);
	return compile(simple.extensionPoint, simple.compiler, extension);
}
