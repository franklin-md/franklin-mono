import type {
	InferRuntime as InferSimpleRuntime,
	InferSignature as InferSimpleSignature,
} from '@franklin/extensibility/module';
import type {
	BaseStateExtensionModule,
	CombineModules as CombineStateModules,
	IdentityState,
	StateExtensionModule,
} from '../../state/index.js';
import {
	combine as combineStateModules,
	fromSimpleModule,
} from '../../state/index.js';
import { createDetailsModule, type DetailsModule } from './details/index.js';
import type {
	OrchestratorHandle,
	OrchestratorModule,
	OrchestratorRuntime,
	OrchestratorState,
} from '../types.js';
import {
	createOrchestrationModule,
	type OrchestrationModule,
} from './orchestration.js';

/**
 * The internal slice of an orchestrated module: persisted runtime details plus
 * the recursive `Orchestration` port.
 */
export type InternalOrchestratorModule<M extends BaseStateExtensionModule> =
	CombineStateModules<DetailsModule, OrchestrationStateModule<M>>;

type OrchestrationStateModule<M extends BaseStateExtensionModule> =
	StateExtensionModule<
		IdentityState,
		InferSimpleSignature<OrchestrationModule<M>>,
		InferSimpleRuntime<OrchestrationModule<M>>
	>;

export type InternalOrchestratorOptions<M extends BaseStateExtensionModule> = {
	readonly id: string;
	readonly getHandle: () => OrchestratorHandle<
		OrchestratorRuntime<M>,
		OrchestratorState<M>
	>;
};

function createOrchestrationStateModule<M extends BaseStateExtensionModule>(
	getHandle: () => OrchestratorHandle<
		OrchestratorRuntime<M>,
		OrchestratorState<M>
	>,
): OrchestrationStateModule<M> {
	return fromSimpleModule(createOrchestrationModule<M>(getHandle));
}

function combineInternalOrchestratorModules<M extends BaseStateExtensionModule>(
	details: DetailsModule,
	orchestration: OrchestrationStateModule<M>,
): InternalOrchestratorModule<M> {
	return combineStateModules(
		details,
		orchestration as never,
	) as unknown as InternalOrchestratorModule<M>;
}

export function createInternalOrchestratorModule<
	M extends BaseStateExtensionModule,
>(opts: InternalOrchestratorOptions<M>): InternalOrchestratorModule<M> {
	return combineInternalOrchestratorModules(
		createDetailsModule(opts.id),
		createOrchestrationStateModule<M>(opts.getHandle),
	);
}

/**
 * Attach the internal stateful details port and stateless orchestration port
 * after the user's module so details participate in state projection.
 */
export function createOrchestratorModule<M extends BaseStateExtensionModule>(
	module: M,
	opts: InternalOrchestratorOptions<M>,
): OrchestratorModule<[M]> {
	const internal = createInternalOrchestratorModule(opts);
	return combineStateModules(
		module,
		internal as never,
	) as unknown as OrchestratorModule<[M]>;
}
