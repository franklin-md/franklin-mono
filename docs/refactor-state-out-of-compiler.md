# Refactor: state out of `Compiler` and `BaseRuntime`

## What changed

Three concerns that were entangled in the algebra are now cleanly separated:

| Layer | Owns |
|---|---|
| `Compiler<API, Runtime>` | extension registration + build (no `<S>`) |
| `BaseRuntime` (no `<S>`) | live capabilities + lifecycle (`dispose`, `subscribe`) |
| `RuntimeSystem<S, API, Runtime>` | `emptyState`, `createCompiler(state)`, `state(runtime)` projection |

Before, every runtime was forced to expose a `state: StateHandle<S>` field, which made
fakes (like `DependencyRuntime`'s no-op state) into ceremonial noise and pinned `<S>`
through `Compiler`, `BaseRuntime`, and several Inference helpers.

## Pattern: configure → register → build

State is captured by closure when the system creates a compiler:

```ts
type RuntimeSystem<S, API, Runtime> = {
  emptyState(): S
  createCompiler(state: S): Compiler<API, Runtime>   // closes over state
  state(runtime: Runtime): StateHandle<S>            // projection
}
```

`createCompiler(state)` returns a state-free `Compiler<API, Runtime>` whose `build`
takes only `getRuntime`. Inside the closure, the system materialises whatever
backing structures the state implies (Store collection, environment observer,
core resources/transport).

## Pattern: private symbol for state projection

Each system stashes its `StateHandle<S>` on the runtime under its own
`unique symbol`, and `system.state(runtime)` reads it back. This keeps `<S>`
out of the public runtime type while avoiding side-channels (no `WeakMap` on
the system, no shared registry).

```ts
const STORE_STATE: unique symbol = Symbol('store/state')

export type StoreRuntime = BaseRuntime & {
  getStore<...>(...): Store<T>
  readonly [STORE_STATE]: StateHandle<StoreState>
}

// system.state is just:
state: (runtime) => runtime[STORE_STATE]
```

Combined systems compose projections by delegating to each sub-system:

```ts
combinedSystem.state = (rt) => mergeHandles(
  s1.state(rt),  // reads runtime[STORE_STATE]
  s2.state(rt),  // reads runtime[ENV_STATE]
)
```

Different systems use different symbols → no collision when combined.

## Things learned along the way

- **Inspect needed an explicit state handle.** `inspectRuntime(runtime)` previously
  read `runtime.state.get()` to pull every system's slot in one go. With state
  off the runtime, the dump can no longer infer the combined state from `runtime`
  alone; callers now pass `system.state(runtime)` (or `coreStateHandle(runtime)`
  for core-only). The dump is unchanged for callers that have the system.

- **Test stubs need the symbol.** Tests that hand-build a `CoreRuntime` to mock
  `getLLMConfig` / `useThinkingLevel` need access to `CORE_STATE` to attach a
  state handle. Exporting `CORE_STATE` (a unique symbol — not a string) keeps
  the symbol "advanced/internal" for ordinary code while letting tests
  construct realistic stubs without re-implementing `createCoreRuntime`. The
  other systems (`STORE_STATE`, `ENV_STATE`) stay module-private since no
  external test needed them.

- **`combineRuntimes` shrunk.** It now composes only `dispose` and `subscribe`
  plus extras. State composition moved to `combineSystems`, which is where it
  semantically belongs — the runtime never knew it was being combined.

- **`PersistedSessionCollection` takes a projection.** It used to call
  `runtime.state.get()` directly. The collection now takes a
  `projectState: (rt) => StateHandle<S>` parameter at construction; the agent
  app passes `(rt) => baseSystem.state(rt)`.

- **`withSetup` didn't need to change much.** Setup callbacks still get
  `(runtime, state)`. State is captured at `createCompiler(state)` time and
  re-passed to setup; no signature break for users.

- **Identity laws still hold.** `combineSystems(identitySystem(), s)` and
  `combineSystems(s, identitySystem())` produce systems whose
  `emptyState`/`state(rt).get()`/runtime extras match `s` exactly — verified
  by the rewritten tests in `algebra/system/__tests__/combine.test.ts`.

## Surprises / trade-offs

- **`inspectRuntime` API broke.** It now requires a state handle. Three call
  sites updated; no production runtime code consumes it directly today.

- **The Y-combinator cell is unchanged.** `getRuntime()` still returns the raw
  runtime — handlers see capabilities directly, not a wrapper. The refactor
  did not need to introduce a `RuntimeInstance` envelope.

- **Environment stayed a checkpointed resource, not a dependency.** Even though
  `EnvironmentRuntime` now looks superficially dependency-shaped
  (`{ environment }` plus the symbol), it still owns a per-session observer
  and reconfigure semantics that `DependencySystem` does not. Reclassifying
  was deliberately out of scope.
