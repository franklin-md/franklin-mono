import type { BaseRuntime } from '../../../../algebra/runtime/index.js';
import type { OrchestratorHandle } from '../../types.js';

export type OrchestrationRuntime<Runtime extends BaseRuntime> = BaseRuntime & {
	readonly orchestrator: OrchestratorHandle<Runtime>;
};
