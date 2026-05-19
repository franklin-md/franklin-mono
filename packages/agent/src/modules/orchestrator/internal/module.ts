import {
	combine as combineSimpleModules,
	combineAll as combineSimpleModulesAll,
	type Modules as SimpleModules,
} from '@franklin/extensibility/modules/simple/index.js';
import type {
	BaseStateExtensionModule,
	InferState,
} from '@franklin/extensibility/modules/state/index.js';
import type {
	OrchestratorHandle,
	OrchestratorModule,
	OrchestratorRuntime,
} from '../types.js';
import {
	createOrchestrationModule,
	type OrchestrationModule,
} from './orchestration.js';
import { createSelfModule, type SelfModule } from './self.js';

/**
 * The internal slice of an orchestrated module: the `Self` identity port and
 * the recursive `Orchestration` port, combined as a stateless extension module.
 */
export type InternalOrchestratorModule<M extends BaseStateExtensionModule> =
	SimpleModules<[SelfModule, OrchestrationModule<M>]>;

export type InternalOrchestratorOptions<M extends BaseStateExtensionModule> = {
	readonly id: string;
	readonly getHandle: () => OrchestratorHandle<
		OrchestratorRuntime<M>,
		InferState<M>
	>;
};

export function createInternalOrchestratorModule<
	M extends BaseStateExtensionModule,
>(opts: InternalOrchestratorOptions<M>): InternalOrchestratorModule<M> {
	return combineSimpleModulesAll([
		createSelfModule(opts.id),
		createOrchestrationModule<M>(opts.getHandle),
	]);
}

/**
 * Attach the internal stateless ports after the user's stateful module has
 * been instantiated. The base state rules remain owned by the user module.
 */
export function createOrchestratorModule<M extends BaseStateExtensionModule>(
	module: M,
	opts: InternalOrchestratorOptions<M>,
): OrchestratorModule<[M]> {
	const internal = createInternalOrchestratorModule(opts);
	return {
		emptyState: () => module.emptyState(),
		state: (runtime) => module.state(runtime as never),
		instantiate(state) {
			return combineSimpleModules(
				module.instantiate(state as InferState<M>),
				internal as never,
			) as never;
		},
	} as OrchestratorModule<[M]>;
}
