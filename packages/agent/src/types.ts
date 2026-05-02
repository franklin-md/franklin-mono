import type {
	CoreModule,
	StoreModule,
	EnvironmentModule,
	Extension,
	InferBoundAPI,
	InferState,
	OrchestratorModule,
	OrchestratorRuntime,
} from '@franklin/extensions';

export type FranklinModules = readonly [
	CoreModule,
	StoreModule,
	EnvironmentModule,
];

export type FranklinModule = OrchestratorModule<FranklinModules>;

export type FranklinRuntime = OrchestratorRuntime<FranklinModules>;

/** Combined state persisted without secrets. */
export type FranklinState = InferState<FranklinModule>;

/** Combined extension API surface. */
export type FranklinAPI = InferBoundAPI<FranklinModule>;

export type FranklinExtension = Extension<FranklinAPI>;
