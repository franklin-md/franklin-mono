import type { Extension } from '@franklin/extensibility';
import type { BuildModules, InferAPI } from './modules/state/index.js';
import type {
	OrchestratorModule,
	OrchestratorRuntime,
} from './modules/orchestrator/index.js';
import type { CoreStateModule } from './modules/core/module.js';
import type { EnvironmentModule } from './modules/environment/module.js';
import type { StoreStateModule } from './modules/store/state-module.js';
import type { FranklinSession } from './app/session/index.js';

export type { FranklinSession } from './app/session/index.js';

export type FranklinModules = readonly [
	CoreStateModule,
	StoreStateModule,
	EnvironmentModule,
];

export type FranklinBase = BuildModules<FranklinModules>;

export type FranklinModule = OrchestratorModule<FranklinModules>;

// Use the named `OrchestratorRuntime<…>` alias rather than
// `InferRuntime<FranklinModule>`: the structural `OrchestratorModule<Mods>`
// (a `Modules<[Modules<Mods>, InternalOrchestratorModule<Modules<Mods>>]>`)
// routes through
// `Simplify<CombinedRuntime<…>>`, which forces TypeScript to inline the
// runtime's `unique symbol` keys (CORE_STATE, …) into downstream dts files.
export type FranklinRuntime = OrchestratorRuntime<FranklinBase>;

/** Compatibility alias for the previous persisted app session name. */
export type FranklinState = FranklinSession;

/** Combined extension API surface. */
export type FranklinAPI = InferAPI<FranklinModule>;

export type FranklinExtension = Extension<FranklinAPI>;
