import { withSetupCompiler } from '../../compiler/index.js';
import type { ExtensionModule } from './types.js';
import type { API } from '../../api/index.js';
import type { BaseRuntime } from '../../runtime/index.js';

export function withSetup<A extends API, Runtime extends BaseRuntime & A['In']>(
	module: ExtensionModule<A, Runtime>,
	setup: (runtime: Runtime) => Promise<void>,
): ExtensionModule<A, Runtime> {
	return {
		extensionPoint: module.extensionPoint,
		compiler: withSetupCompiler(module.compiler, setup),
	};
}
