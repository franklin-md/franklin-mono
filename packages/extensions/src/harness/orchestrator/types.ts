import type { DeepPartial } from '@franklin/lib';
import type { Extension } from '../../algebra/extension/index.js';
import type {
	BaseRuntime,
	RuntimeExtras,
} from '../../algebra/runtime/index.js';
import type {
	BaseHarnessModule,
	HarnessModule,
	InferAPI,
	InferBoundAPI,
	InferRuntime,
	InferState,
	Modules,
	ValidateModules,
} from '../modules/index.js';
import type { SelfRuntime } from './internal-module.js';
import type { RuntimeCollection } from './collection.js';

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
 * The runtime produced by an orchestrator over a tuple of base modules.
 * Recursive fixed point: `runtime.orchestrator` references this same type.
 *
 * Exported as a named alias so that dts emission can reference it by name —
 * runtime fields use `unique symbol` keys (CORE_STATE, ENV_STATE, ...) which
 * cannot be safely inlined into downstream consumers' declaration files.
 */
export type OrchestratorRuntime<Mods extends readonly BaseHarnessModule[]> =
	BaseRuntime &
		RuntimeExtras<InferRuntime<Modules<Mods>>> &
		SelfRuntime & {
			readonly orchestrator: OrchestratorHandle<
				OrchestratorRuntime<Mods>,
				InferState<Modules<Mods>>
			>;
		};

/**
 * The fully orchestrated module for a tuple of base modules. It is itself a
 * `HarnessModule`, so the standard inference helpers (`InferRuntime`,
 * `InferState`, `InferBoundAPI`) work on it directly:
 *
 *   type FranklinModule    = OrchestratorModule<FranklinModules>;
 *   type FranklinRuntime   = OrchestratorRuntime<FranklinModules>;
 *   type FranklinState     = InferState<FranklinModule>;
 *   type FranklinAPI       = InferBoundAPI<FranklinModule>;
 *   type FranklinExtension = Extension<FranklinAPI>;
 */
export type OrchestratorModule<Mods extends readonly BaseHarnessModule[]> =
	HarnessModule<
		InferState<Modules<Mods>>,
		InferAPI<Modules<Mods>>,
		OrchestratorRuntime<Mods>
	>;

export type OrchestratorOptions<Mods extends readonly BaseHarnessModule[]> = {
	readonly modules: readonly [...Mods] & ValidateModules<Mods>;
	readonly collection: RuntimeCollection<
		InferRuntime<OrchestratorModule<Mods>>
	>;
	readonly extensions: Extension<InferBoundAPI<OrchestratorModule<Mods>>>[];
	readonly createId?: () => string;
};

export type RuntimeEvent<Runtime extends BaseRuntime> =
	| { readonly action: 'add'; readonly id: string; readonly runtime: Runtime }
	| {
			readonly action: 'remove';
			readonly id: string;
			readonly runtime: Runtime;
	  };
