import type {
	CoreModule,
	StoreModule,
	EnvironmentModule,
	Extension,
	InferBoundAPI,
	InferState,
	Modules,
	OrchestratorModule,
	OrchestratorRuntime,
} from '@franklin/extensions';

export type FranklinModules = readonly [
	CoreModule,
	StoreModule,
	EnvironmentModule,
];

export type FranklinBase = Modules<FranklinModules>;

export type FranklinModule = OrchestratorModule<FranklinModules>;

// Use the named `OrchestratorRuntime<…>` alias rather than
// `InferRuntime<FranklinModule>`: the structural `OrchestratorModule<Mods>`
// (a `Modules<[Modules<Mods>, InternalOrchestratorModule<Modules<Mods>>]>`)
// routes through
// `Simplify<CombinedRuntime<…>>`, which forces TypeScript to inline the
// runtime's `unique symbol` keys (CORE_STATE, …) into downstream dts files.
export type FranklinRuntime = OrchestratorRuntime<FranklinBase>;

/** Combined state persisted without secrets. */
export type FranklinState = InferState<FranklinModule>;

/** Combined extension API surface. */
export type FranklinAPI = InferBoundAPI<FranklinModule>;

export type FranklinExtension = Extension<FranklinAPI>;
