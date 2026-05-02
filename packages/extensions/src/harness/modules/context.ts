import type { BaseRuntime } from '../../algebra/runtime/index.js';

export type RuntimeEntry<Runtime extends BaseRuntime> = {
	readonly id: string;
	readonly runtime: Runtime;
};

export type RuntimeCreateInput = {
	readonly from?: string;
	readonly mode?: 'child' | 'fork';
};

export type RuntimeOrchestratorPort<Runtime extends BaseRuntime> = {
	create(input?: RuntimeCreateInput): Promise<RuntimeEntry<Runtime>>;
	get(id: string): RuntimeEntry<Runtime> | undefined;
	list(): RuntimeEntry<Runtime>[];
	remove(id: string): Promise<boolean>;
};

export type HarnessModuleCompilerContext = {
	readonly id: string;
	getOrchestrator<
		ContextRuntime extends BaseRuntime,
	>(): RuntimeOrchestratorPort<ContextRuntime>;
};

export type HarnessModuleCompilerInput<S> = HarnessModuleCompilerContext & {
	readonly state: S;
};

function missingOrchestrator<
	ContextRuntime extends BaseRuntime,
>(): RuntimeOrchestratorPort<ContextRuntime> {
	return {
		async create(): Promise<RuntimeEntry<ContextRuntime>> {
			throw new Error('No runtime orchestrator is available');
		},
		get(): RuntimeEntry<ContextRuntime> | undefined {
			throw new Error('No runtime orchestrator is available');
		},
		list(): RuntimeEntry<ContextRuntime>[] {
			throw new Error('No runtime orchestrator is available');
		},
		async remove(): Promise<boolean> {
			throw new Error('No runtime orchestrator is available');
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
