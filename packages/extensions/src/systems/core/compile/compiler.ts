import type { ClientProtocol } from '@franklin/mini-acp';
import type { CoreAPI } from '../api/api.js';
import type { Compiler } from '../../../algebra/compiler/types.js';
import type { MaybePromise } from '../../../algebra/types/shared.js';
import { serializeTool } from '../api/tools/index.js';
import { createAgentDecorator as createClientDecorator } from './decorators/full.js';
import { createCoreRegistrar } from './registrar/index.js';
import { assembleRuntime, type CoreRuntime } from '../runtime.js';
import type { CoreState } from '../state.js';
import { createResources } from './resources.js';
import { createAgentClient } from './client.js';

export type SpawnResult = ClientProtocol & { dispose(): Promise<void> };
export type SpawnFn = () => MaybePromise<SpawnResult>;

/**
 * Fresh core compiler.
 *
 * **Registration (api):** extensions register raw handlers/tools into a
 * transport-free `CoreRegistrar` — stored as data, not yet bound to runtime.
 *
 * **Build:** receives `state` and `getRuntime` (lazy reference to the
 * eventual fully-tied Runtime). `spawn()` is invoked here so the transport
 * lifecycle is scoped to the runtime it powers — callers that never build
 * never pay for a transport. `composeDecorators` turns the registrar plus
 * `getRuntime` into the decorator stack `createCoreRuntime` applies.
 *
 * Registered tools are serialized once here and threaded into the boot
 * phase inside `createCoreRuntime` — the agent receives the session's
 * full tool list at startup, independent of any app-side setContext call.
 *
 * No mutable runtime cell — `getRuntime` IS the binding mechanism,
 * threaded through each builder at decorator-construction time.
 */
export function createCoreCompiler<Runtime extends CoreRuntime = CoreRuntime>(
	spawn: SpawnFn,
): Compiler<CoreAPI<Runtime>, CoreState, Runtime> {
	const { api, registered } = createCoreRegistrar<Runtime>();

	return {
		api,
		async build(state, getRuntime): Promise<Runtime> {
			const transport = await spawn();
			const resources = createResources(state);
			const decorator = createClientDecorator(
				resources,
				registered,
				getRuntime,
			);
			const serializedTools = registered.tools.map(serializeTool);

			const client = await createAgentClient({
				transport,
				decorator,
				state,
				tools: serializedTools,
			});

			return assembleRuntime(
				client,
				resources.tracker,
				resources.stateHandle,
			) as Runtime;
		},
	};
}
