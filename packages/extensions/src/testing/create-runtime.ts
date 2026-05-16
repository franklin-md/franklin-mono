import {
	reduceExtensions,
	type Extension,
} from '../algebra/extension/index.js';
import { compile } from '../algebra/index.js';
import type {
	BaseStateExtensionModule,
	InferAPI,
	InferRuntime,
	InferState,
} from '../algebra/modules/state/index.js';

export async function createRuntime<Module extends BaseStateExtensionModule>(
	module: Module,
	state: InferState<Module>,
	extensions: Extension<InferAPI<Module>>[],
): Promise<InferRuntime<Module>> {
	const simple = module.instantiate(state);
	const extension = reduceExtensions(...extensions);
	return compile(simple.extensionPoint, simple.compiler, extension);
}
