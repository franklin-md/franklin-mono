import type { MiniACPConnector } from '@franklin/mini-acp';
import type { StateExtensionModule } from '../../state/index.js';

import type { CoreSignature } from '../api/api.js';
import type { CoreRuntime } from '../runtime/index.js';
import type { CoreState } from '../state.js';
import { emptyCoreState } from '../state.js';
import { createCoreModule } from './inner.js';
import { coreStateFromSession } from './state.js';

export type CoreStateModule = StateExtensionModule<
	CoreState,
	CoreSignature,
	CoreRuntime
>;

export function createCoreStateModule(
	connectAgent: MiniACPConnector,
): CoreStateModule {
	return {
		emptyState: emptyCoreState,
		state: coreStateFromSession,
		instantiate: (state) => createCoreModule(connectAgent, state.core),
	};
}
