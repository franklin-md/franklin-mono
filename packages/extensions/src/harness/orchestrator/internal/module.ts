import {
	combine,
	combineAll,
	type BaseHarnessModule,
	type InferState,
	type Modules,
} from '../../modules/index.js';
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
 * the recursive `Orchestration` port, combined. Composed against the user's
 * base module to form the full `OrchestratorModule<[M]>`.
 */
export type InternalOrchestratorModule<M extends BaseHarnessModule> = Modules<
	[SelfModule, OrchestrationModule<M>]
>;

export type InternalOrchestratorOptions<M extends BaseHarnessModule> = {
	readonly id: string;
	readonly getHandle: () => OrchestratorHandle<
		OrchestratorRuntime<M>,
		InferState<M>
	>;
};

export function createInternalOrchestratorModule<M extends BaseHarnessModule>(
	opts: InternalOrchestratorOptions<M>,
): InternalOrchestratorModule<M> {
	return combineAll([
		createSelfModule(opts.id),
		createOrchestrationModule<M>(opts.getHandle),
	]);
}

/**
 * Compose the user's base module with the internal `Self` + orchestration
 * ports to produce the full `OrchestratorModule<[M]>`.
 *
 * `combine`'s `CombinableModule` constraint requires `AssertNoOverlap` on
 * runtime extras, which TypeScript cannot prove for a generic `M` against
 * the `self` / `orchestrator` keys contributed here. The keys are disjoint
 * by construction (no user module declares them), so the cast is sound and
 * stays encapsulated in this factory rather than leaking to call sites.
 *
 * TODO: Encode an OrchestratableModule/CombinableWithInternal constraint so
 * generic base modules are statically proven not to overlap reserved runtime
 * keys (`self`, `orchestrator`) before calling `combine`.
 */
export function createOrchestratorModule<M extends BaseHarnessModule>(
	module: M,
	opts: InternalOrchestratorOptions<M>,
): OrchestratorModule<[M]> {
	const internal = createInternalOrchestratorModule(opts);
	return combine(module, internal as never) as unknown as OrchestratorModule<
		[M]
	>;
}
