import type { ClientProtocol } from '@franklin/mini-acp';
import type { CoreAPI } from '../api/core/api.js';
import { createCoreCompiler } from '../compile/core/compiler.js';
import type { Compiler } from '../compile/types.js';
import type { RuntimeSystem } from './types.js';
import type { CoreState } from '../state/core.js';
import { emptyCoreState } from '../state/core.js';
import type { CoreRuntime } from '../runtime/core.js';

type SpawnFn = () =>
	| (ClientProtocol & { dispose(): Promise<void> })
	| Promise<ClientProtocol & { dispose(): Promise<void> }>;

export type CoreSystem = RuntimeSystem<CoreState, CoreAPI, CoreRuntime>;

export function createCoreSystem(spawn: SpawnFn): CoreSystem {
	return {
		emptyState: emptyCoreState,

		async createCompiler(
			state: CoreState,
		): Promise<Compiler<CoreAPI, CoreRuntime>> {
			const transport = await spawn();
			return createCoreCompiler(transport, state);
		},
	};
}
