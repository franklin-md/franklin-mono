import type { DeepPartial } from '@franklin/lib';
import type {
	BaseRuntime,
	RuntimeExtras,
} from '../../algebra/runtime/index.js';
import type {
	BaseHarnessModule,
	InferRuntime,
	InferState,
	Modules,
} from '../modules/index.js';
import type {
	InternalOrchestratorModule,
	SelfRuntime,
} from './internal/index.js';

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

export type OrchestratorHandle<Runtime extends BaseRuntime, State = unknown> = {
	create(
		input?: OrchestratorCreateInput<State>,
	): Promise<RuntimeEntry<Runtime>>;
	get(id: string): RuntimeEntry<Runtime> | undefined;
	list(): RuntimeEntry<Runtime>[];
	remove(id: string): Promise<boolean>;
	materialize(id: string, state: State): Promise<RuntimeEntry<Runtime>>;
};

/**
 * Runtime produced by an orchestrator over a base module. Recursive fixed
 * point: `runtime.orchestrator` references this same type.
 *
 * Spelled as a manual intersection (rather than
 * `InferRuntime<OrchestratorModule<[M]>>`) so dts emission can reference it by
 * name. Going through `Modules`/`CombineModules` would route through
 * `Simplify<CombinedRuntime<…>>`, which forces TypeScript to enumerate keys
 * at write-time and inlines the runtime's `unique symbol` keys (CORE_STATE,
 * ENV_STATE, …) into every downstream consumer's declaration file.
 *
 * TODO: Replace symbol-backed runtime state handles with a uniform module-local
 * state registry so this type can be inferred from `OrchestratorModule`.
 */
export type OrchestratorRuntime<M extends BaseHarnessModule> = BaseRuntime &
	RuntimeExtras<InferRuntime<M>> &
	SelfRuntime & {
		readonly orchestrator: OrchestratorHandle<
			OrchestratorRuntime<M>,
			InferState<M>
		>;
	};

/**
 * The fully orchestrated module for a module list: the reduced user modules
 * composed with the internal `Self` + orchestration ports (see
 * `InternalOrchestratorModule`). It is itself a `HarnessModule`, so the
 * standard inference helpers (`InferRuntime`, `InferState`, `InferBoundAPI`)
 * work on it directly:
 *
 *   type FranklinBase      = Modules<FranklinModules>;
 *   type FranklinModule    = OrchestratorModule<FranklinModules>;
 *   type FranklinRuntime   = OrchestratorRuntime<FranklinBase>;
 *   type FranklinState     = InferState<FranklinModule>;
 *   type FranklinAPI       = InferBoundAPI<FranklinModule>;
 *   type FranklinExtension = Extension<FranklinAPI>;
 */
export type OrchestratorModule<Mods extends readonly BaseHarnessModule[]> =
	Modules<[Modules<Mods>, InternalOrchestratorModule<Modules<Mods>>]>;

export type RuntimeEvent<Runtime extends BaseRuntime> =
	| { readonly action: 'add'; readonly id: string; readonly runtime: Runtime }
	| {
			readonly action: 'remove';
			readonly id: string;
			readonly runtime: Runtime;
	  };
