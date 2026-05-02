import type { ClientProtocol } from '@franklin/mini-acp';
import type { Compiler } from '../../../algebra/compiler/types.js';
import type { BaseRuntime } from '../../../algebra/runtime/index.js';
import type { MaybePromise } from '../../../algebra/types/shared.js';
import type { CoreAPI } from '../api/api.js';
import { serializeTool } from '../api/tools/index.js';
import { type CoreRuntime, createCoreRuntime } from '../runtime/index.js';
import type { CoreState } from '../state.js';
import { createAgentClient } from './client.js';
import { createAgentDecorator as createClientDecorator } from './decorators/full.js';
import {
	asCoreRegistrar,
	createCoreApi,
	createCoreRegistrations,
} from './registrar/index.js';
import { createResources } from './resources.js';

export type SpawnResult = ClientProtocol & { dispose(): Promise<void> };
export type SpawnFn = () => MaybePromise<SpawnResult>;

/**
 * Fresh core compiler.
 *
 * **Registration (api):** extensions register raw handlers/tools into a
 * transport-free `CoreRegistrar` — stored as data, not yet bound to runtime.
 *
 * **Build:** receives `getRuntime` (lazy reference to the eventual
 * fully-tied Runtime); state was captured by closure when this compiler
 * was created. `spawn()` is invoked here so the transport lifecycle is
 * scoped to the runtime it powers — callers that never build never pay
 * for a transport. `composeDecorators` turns the registrar plus
 * `getRuntime` into the decorator stack `createCoreRuntime` applies.
 *
 * Registered tools are serialized once here and threaded into the boot
 * phase inside `createCoreRuntime` — the agent receives the session's
 * full tool list at startup, independent of any app-side setContext call.
 *
 * No mutable runtime cell — `getRuntime` IS the binding mechanism,
 * threaded through each builder at decorator-construction time.
 */
export function createCoreCompiler(
	spawn: SpawnFn,
	state: CoreState,
): Compiler<CoreAPI, CoreRuntime> {
	const registrations = createCoreRegistrations();

	return {
		createApi: <ContextRuntime extends BaseRuntime>() =>
			createCoreApi<ContextRuntime>(registrations),
		build: async <ContextRuntime extends BaseRuntime>(
			getRuntime: () => ContextRuntime & Pick<ContextRuntime, never>,
		): Promise<CoreRuntime> => {
			const transport = await spawn();
			const resources = createResources(state);
			const coreRegistrar = asCoreRegistrar<ContextRuntime>(registrations);
			const decorator = createClientDecorator(
				resources,
				coreRegistrar,
				getRuntime,
			);
			const serializedTools = coreRegistrar.tools.map(serializeTool);

			const client = await createAgentClient({
				transport,
				decorator,
				state,
				tools: serializedTools,
			});

			return createCoreRuntime({
				client,
				tracker: resources.tracker,
				state: resources.stateHandle,
			});
		},
	};
}
