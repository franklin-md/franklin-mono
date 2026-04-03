import type {
	CoreSystem,
	StoreSystem,
	EnvironmentSystem,
	CombineSystems,
	InferState,
	InferAPI,
	InferRuntime,
} from '@franklin/extensions';

/** The combined system: combine(core, combine(store, env)). */
type FullSystem = CombineSystems<
	CoreSystem,
	CombineSystems<StoreSystem, EnvironmentSystem>
>;

// ---------------------------------------------------------------------------
// Derived types — all flow from the concrete system types
// ---------------------------------------------------------------------------

/** Combined state — persisted without secrets. */
export type SessionState = InferState<FullSystem>;

/** Combined extension API surface. */
export type SessionAPI = InferAPI<FullSystem>;

/** Combined runtime — the live running session. */
export type SessionRuntime = InferRuntime<FullSystem>;
