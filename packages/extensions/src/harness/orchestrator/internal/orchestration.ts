import {
	createDependencyModule,
	type DependencyModule,
} from '../../../modules/dependency/module.js';
import type {
	BaseHarnessModule,
	InferRuntime,
	InferState,
} from '../../modules/index.js';
import type { OrchestratorHandle, OrchestratorRuntime } from '../types.js';

type OrchestrationHandle<M extends BaseHarnessModule> = OrchestratorHandle<
	OrchestratorRuntime<M>,
	InferState<M>
>;

export type OrchestrationModule<M extends BaseHarnessModule> = DependencyModule<
	'orchestrator',
	OrchestrationHandle<M>
>;

// TODO: Do we need to export this? I think this is dead code
export type OrchestrationRuntime<M extends BaseHarnessModule> = InferRuntime<
	OrchestrationModule<M>
>;

export function createOrchestrationModule<M extends BaseHarnessModule>(
	getHandle: () => OrchestrationHandle<M>,
): OrchestrationModule<M> {
	return createDependencyModule('orchestrator', getHandle());
}
