import { withSetupCompiler } from '../../compiler/index.js';
import type { ExtensionModule } from './types.js';
import type { Signature } from '../../api/index.js';
import type { BaseRuntime } from '../../runtime/index.js';

export function withSetup<
	S extends Signature,
	Runtime extends BaseRuntime & S['In'],
>(
	module: ExtensionModule<S, Runtime>,
	setup: (runtime: Runtime) => Promise<void>,
): ExtensionModule<S, Runtime> {
	return {
		extensionPoint: module.extensionPoint,
		compiler: withSetupCompiler(module.compiler, setup),
	};
}
