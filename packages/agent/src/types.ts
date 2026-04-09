import type {
	CoreSystem,
	StoreSystem,
	EnvironmentSystem,
	CombineSystems,
	InferState,
	InferAPI,
	InferRuntime,
	SessionSystem,
} from '@franklin/extensions';

/** The combined system: combine(core, combine(store, env)). */
type FullSystem = CombineSystems<
	CoreSystem,
	CombineSystems<StoreSystem, CombineSystems<EnvironmentSystem, SessionSystem>>
>;

// ---------------------------------------------------------------------------
// Derived types — all flow from the concrete system types
// ---------------------------------------------------------------------------

/** Combined state — persisted without secrets. */
export type FranklinState = InferState<FullSystem>;

/** Combined extension API surface. */
export type FranklinAPI = InferAPI<FullSystem>;

export type FranklinExtension = (api: FranklinAPI) => void;

/** Combined runtime — the live running session. */
export type FranklinRuntime = InferRuntime<FullSystem>;
