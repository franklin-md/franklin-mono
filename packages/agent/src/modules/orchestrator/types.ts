import type { DeepPartial } from '@franklin/lib';
import type { CombineSignature } from '@franklin/extensibility';
import type {
	BaseStateExtensionModule,
	BuildableModule,
	BuildModules,
	InferRuntime,
	InferSignature,
	InferState,
	StateExtensionModule,
} from '../state/index.js';
import type {
	BaseRuntime,
	CombinedRuntime,
	RuntimeExtras,
} from '@franklin/extensibility';
import type {
	Details,
	DetailsRuntime,
	DetailsState,
} from './internal/details/index.js';
import type { InternalOrchestratorModule } from './internal/index.js';

export type RuntimeEntry<Runtime extends BaseRuntime> = {
	readonly details: Details;
	readonly runtime: Runtime;
};

export type RuntimeCreateInput = {
	readonly from?: string;
	readonly mode?: 'child' | 'fork';
};

export type OrchestratorCreateInput<State = unknown> = RuntimeCreateInput & {
	readonly id?: string;
	readonly state?: DeepPartial<State>;
};

export type OrchestratorHandle<Runtime extends BaseRuntime, State = unknown> = {
	create(
		input?: OrchestratorCreateInput<State>,
	): Promise<RuntimeEntry<Runtime>>;
	get(id: string): RuntimeEntry<Runtime> | undefined;
	list(): RuntimeEntry<Runtime>[];
	remove(id: string): Promise<boolean>;
};

export type OrchestratorState<M extends BaseStateExtensionModule> =
	InferState<M> & DetailsState;

/**
 * Runtime produced by an orchestrator over a base module. Recursive fixed
 * point: `runtime.orchestrator` references this same type.
 *
 * Spelled as a manual intersection (rather than
 * `InferRuntime<OrchestratorModule<[M]>>`) so dts emission can reference it by
 * name. Going through `Modules`/`CombineModules` would route through
 * `Simplify<CombinedRuntime<…>>`, which forces TypeScript to enumerate keys
 * at write-time and inlines the runtime's `unique symbol` keys (ENV_STATE,
 * STORE_MAPPING, …) into every downstream consumer's declaration file.
 *
 * TODO: Replace symbol-backed runtime state handles with a uniform module-local
 * state registry so this type can be inferred from `OrchestratorModule`.
 */
export type OrchestratorRuntime<M extends BaseStateExtensionModule> =
	BaseRuntime &
		RuntimeExtras<InferRuntime<M>> &
		RuntimeExtras<DetailsRuntime> & {
			readonly orchestrator: OrchestratorHandle<
				OrchestratorRuntime<M>,
				OrchestratorState<M>
			>;
		};

/**
 * The fully orchestrated module for a module list: the reduced user modules
 * composed with the internal details + orchestration ports (see
 * `InternalOrchestratorModule`). It is itself a state extension module, so the
 * standard inference helpers (`InferRuntime`, `InferState`, `InferAPI`) work on
 * it directly:
 *
 *   type FranklinBase      = BuildModules<FranklinModules>;
 *   type FranklinModule    = OrchestratorModule<FranklinModules>;
 *   type FranklinRuntime   = OrchestratorRuntime<FranklinBase>;
 *   type FranklinState     = InferState<FranklinModule>;
 *   type FranklinAPI       = InferAPI<FranklinModule>;
 *   type FranklinExtension = Extension<FranklinAPI>;
 */
export type OrchestratorModule<Mods extends readonly BuildableModule[]> =
	StateExtensionModule<
		OrchestratorState<BuildModules<Mods>>,
		CombineSignature<
			InferSignature<BuildModules<Mods>>,
			InferSignature<InternalOrchestratorModule<BuildModules<Mods>>>
		>,
		CombinedRuntime<
			InferRuntime<BuildModules<Mods>>,
			InferRuntime<InternalOrchestratorModule<BuildModules<Mods>>>
		>
	>;

export type RuntimeEvent<Runtime extends BaseRuntime> =
	| {
			readonly action: 'add';
			readonly id: string;
			readonly runtime: Runtime;
	  }
	| {
			readonly action: 'remove';
			readonly id: string;
			readonly runtime: Runtime;
	  };
