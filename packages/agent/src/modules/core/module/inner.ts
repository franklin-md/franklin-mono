import type { MiniACPConnector } from '@franklin/mini-acp';
import { createExtensionPoint } from '@franklin/extensibility';

import type { CoreSignature } from '../api/api.js';
import { createCoreCompiler } from '../compile/compiler.js';
import type { SessionSnapshot } from '../state.js';
import type { CoreModule } from './types.js';

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
