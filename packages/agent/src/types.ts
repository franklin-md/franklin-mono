import type {
	CoreModule,
	StoreModule,
	EnvironmentModule,
	CombineModules,
	InferState,
	OrchestratedAPI,
	OrchestratedExtension,
	OrchestratedRuntime,
} from '@franklin/extensions';

export type BaseModule = CombineModules<
	CoreModule,
	CombineModules<StoreModule, EnvironmentModule>
>;

export type FranklinRuntime = OrchestratedRuntime<BaseModule>;

/** Combined state persisted without secrets. */
export type FranklinState = InferState<BaseModule>;

/** Combined extension API surface. */
export type FranklinAPI = OrchestratedAPI<BaseModule>;

export type FranklinExtension = OrchestratedExtension<BaseModule>;
