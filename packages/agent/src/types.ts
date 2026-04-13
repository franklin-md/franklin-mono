import type {
	CoreSystem,
	StoreSystem,
	EnvironmentSystem,
	CombineSystems,
	SessionSystem,
	InferState,
	InferRuntime,
	InferAPI,
} from '@franklin/extensions';

// ---------------------------------------------------------------------------
// Base system = core + store + env (static, shared across sessions)
// ---------------------------------------------------------------------------

export type BaseSystem = CombineSystems<
	CoreSystem,
	CombineSystems<StoreSystem, EnvironmentSystem>
>;

// ---------------------------------------------------------------------------
// Full types — session system is combined dynamically per session.
//
// FranklinRuntime is self-referential (session.child returns FranklinRuntime).
// We split this into a non-recursive base type + a recursive interface,
// because TypeScript allows self-referential interfaces but not type aliases.
// ---------------------------------------------------------------------------

export type FranklinSystem = SessionSystem<BaseSystem>;

export type FranklinRuntime = InferRuntime<FranklinSystem>;

/** Combined state — persisted without secrets. */
export type FranklinState = InferState<FranklinSystem>;

/** Combined extension API surface. */
export type FranklinAPI = InferAPI<FranklinSystem>;

export type FranklinExtension = (api: FranklinAPI) => void;
