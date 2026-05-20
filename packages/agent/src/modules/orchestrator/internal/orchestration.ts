import {
	createDependencyModule,
	type DependencyModule,
} from '@franklin/extensibility/module';
import type { InferRuntime } from '@franklin/extensibility/module';
import type {
	BaseStateExtensionModule,
	InferState,
} from '../../state/index.js';
import type { OrchestratorHandle, OrchestratorRuntime } from '../types.js';

type OrchestrationHandle<M extends BaseStateExtensionModule> =
	OrchestratorHandle<OrchestratorRuntime<M>, InferState<M>>;

export type OrchestrationModule<M extends BaseStateExtensionModule> =
	DependencyModule<'orchestrator', OrchestrationHandle<M>>;

export type OrchestrationRuntime<M extends BaseStateExtensionModule> =
	InferRuntime<OrchestrationModule<M>>;

export function createOrchestrationModule<M extends BaseStateExtensionModule>(
	getHandle: () => OrchestrationHandle<M>,
): OrchestrationModule<M> {
	return createDependencyModule('orchestrator', getHandle());
}
