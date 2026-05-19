import { reduceExtensions, type Extension } from '@franklin/extensibility';
import { compile } from '@franklin/extensibility';
import type {
	BaseStateExtensionModule,
	InferAPI,
	InferRuntime,
	InferState,
} from '@franklin/extensibility';

export async function createRuntime<Module extends BaseStateExtensionModule>(
	module: Module,
	state: InferState<Module>,
	extensions: Extension<InferAPI<Module>>[],
): Promise<InferRuntime<Module>> {
	const simple = module.instantiate(state);
	const extension = reduceExtensions(...extensions);
	return compile(simple.extensionPoint, simple.compiler, extension);
}
