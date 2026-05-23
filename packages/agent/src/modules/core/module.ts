import type { MiniACPConnector } from '@franklin/mini-acp';
import { createExtensionPoint } from '@franklin/extensibility';
import type { ExtensionModule } from '@franklin/extensibility/module';
import type { CoreSignature } from './api/api.js';
import { createCoreCompiler } from './compile/compiler.js';
import type { CoreRuntime } from './runtime/index.js';
import type { SessionSnapshot } from './state.js';

/**
 * Core builds only `CoreRuntime`, but its API is applied to the
 * eventual fully-tied runtime during module composition.
 */
export type CoreModule = ExtensionModule<CoreSignature, CoreRuntime>;

const coreExtensionPoint = createExtensionPoint<CoreSignature>({
	on: true,
	registerTool: true,
});

export function createCoreModule(
	connectAgent: MiniACPConnector,
	session: SessionSnapshot,
): CoreModule {
	return {
		extensionPoint: coreExtensionPoint,
		compiler: createCoreCompiler(connectAgent, session),
	};
}
