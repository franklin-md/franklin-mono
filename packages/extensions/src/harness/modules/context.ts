import type { DeepPartial } from '@franklin/lib';
import type { BaseRuntime } from '../../algebra/runtime/index.js';

const NO_ORCHESTRATOR_MSG = 'No runtime orchestrator is available';

export type RuntimeEntry<Runtime extends BaseRuntime> = {
	readonly id: string;
	readonly runtime: Runtime;
};

export type RuntimeCreateInput = {
	readonly from?: string;
	readonly mode?: 'child' | 'fork';
};

export type OrchestratorCreateInput<State = unknown> = RuntimeCreateInput & {
	readonly overrides?: DeepPartial<State>;
};

export type OrchestratorHandle<
	Runtime extends BaseRuntime,
	State = unknown,
> = {
	create(input?: OrchestratorCreateInput<State>): Promise<RuntimeEntry<Runtime>>;
	get(id: string): RuntimeEntry<Runtime> | undefined;
	list(): RuntimeEntry<Runtime>[];
	remove(id: string): Promise<boolean>;
	materialize(id: string, state: State): Promise<RuntimeEntry<Runtime>>;
};

export type HarnessModuleCompilerContext = {
	readonly id: string;
	getOrchestrator<
		ContextRuntime extends BaseRuntime,
	>(): OrchestratorHandle<ContextRuntime>;
};

export type HarnessModuleCompilerInput<S> = HarnessModuleCompilerContext & {
	readonly state: S;
};

function missingOrchestrator<
	ContextRuntime extends BaseRuntime,
>(): OrchestratorHandle<ContextRuntime> {
	return {
		async create(): Promise<RuntimeEntry<ContextRuntime>> {
			throw new Error(NO_ORCHESTRATOR_MSG);
		},
		get(): RuntimeEntry<ContextRuntime> | undefined {
			throw new Error(NO_ORCHESTRATOR_MSG);
		},
		list(): RuntimeEntry<ContextRuntime>[] {
			throw new Error(NO_ORCHESTRATOR_MSG);
		},
		async remove(): Promise<boolean> {
			throw new Error(NO_ORCHESTRATOR_MSG);
		},
		async materialize(): Promise<RuntimeEntry<ContextRuntime>> {
			throw new Error(NO_ORCHESTRATOR_MSG);
		},
	};
}

export function createHarnessModuleCompilerInput<S>(
	state: S,
	context?: Partial<HarnessModuleCompilerContext>,
): HarnessModuleCompilerInput<S> {
	return {
		state,
		id: context?.id ?? crypto.randomUUID(),
		getOrchestrator:
			context?.getOrchestrator ??
			(<ContextRuntime extends BaseRuntime>() =>
				missingOrchestrator<ContextRuntime>()),
	};
}
