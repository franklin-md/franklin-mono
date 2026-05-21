import type { StateHandle } from '@franklin/extensibility';
import type { MiniACPConnector } from '@franklin/mini-acp';
import { createExtensionPoint } from '@franklin/extensibility';
import type { ExtensionModule } from '@franklin/extensibility/module';
import type { StateExtensionModule } from '../state/index.js';
import type { CoreSignature } from './api/api.js';
import { createCoreCompiler } from './compile/compiler.js';
import type { CoreRuntime } from './runtime/index.js';
import {
	childSessionSnapshot,
	forkSessionSnapshot,
} from './agent-state/index.js';
import type { CoreState, SessionSnapshot } from './state.js';
import { emptyCoreState } from './state.js';

/**
 * Core builds only `CoreRuntime`, but its API is applied to the
 * eventual fully-tied runtime during module composition.
 */
export type CoreModule = ExtensionModule<CoreSignature, CoreRuntime>;

export type CoreStateModule = StateExtensionModule<
	CoreState,
	CoreSignature,
	CoreRuntime
>;

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

export function createCoreStateModule(
	connectAgent: MiniACPConnector,
): CoreStateModule {
	return {
		emptyState: emptyCoreState,
		state: coreStateFromSession,
		instantiate: (state) => createCoreModule(connectAgent, state.core),
	};
}

function coreStateFromSession(runtime: CoreRuntime): StateHandle<CoreState> {
	return {
		get: async () => ({ core: runtime.getSession() }),
		fork: async () => ({
			core: forkSessionSnapshot(runtime.getSession()),
		}),
		child: async () => ({
			core: childSessionSnapshot(runtime.getSession()),
		}),
	};
}
