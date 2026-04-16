import type { ClientProtocol } from '@franklin/mini-acp';
import type { CoreAPI } from './api/api.js';
import { createCoreCompiler } from './compile/compiler.js';
import type { Compiler } from '../../algebra/compiler/types.js';
import type { RuntimeSystem } from '../../algebra/system/types.js';
import type { CoreState } from './state.js';
import { emptyCoreState } from './state.js';
import type { CoreRuntime } from './runtime.js';

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
