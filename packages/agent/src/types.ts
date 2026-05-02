import type {
	CoreModule,
	StoreModule,
	EnvironmentModule,
	Extension,
	InferBoundAPI,
	InferState,
	Modules,
	OrchestratorModule,
	InferRuntime,
} from '@franklin/extensions';

export type FranklinModules = readonly [
	CoreModule,
	StoreModule,
	EnvironmentModule,
];

export type FranklinBase = Modules<FranklinModules>;

export type FranklinModule = OrchestratorModule<FranklinBase>;

export type FranklinRuntime = InferRuntime<FranklinModule>;

/** Combined state persisted without secrets. */
export type FranklinState = InferState<FranklinModule>;

/** Combined extension API surface. */
export type FranklinAPI = InferBoundAPI<FranklinModule>;

export type FranklinExtension = Extension<FranklinAPI>;
