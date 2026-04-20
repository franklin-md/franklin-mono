# Memo 06: Trial — Y-combinator Compiler + Pure-Registration APIs

Trial of the algebra refactor, on top of Trial 1 (attach-based). Goal:
make phase structure entirely type-level, eliminate cells/proxies,
reduce every api to pure Bucket-A registration.

## The final shape

### `Compiler`

```ts
type Compiler<API, S, Runtime> = {
  api: API;
  build(state: S, getRuntime: () => Runtime): Promise<Runtime>;
};
```

- `api` — registration surface (pure writes).
- `build(state, getRuntime)` — ties the Y-combinator. `state` available
  here, not at `createCompiler`. `getRuntime` is a lazy reference to the
  eventual fully-tied Runtime; handlers close over it.

### `RuntimeSystem`

```ts
type RuntimeSystem<S, API, Runtime> = {
  emptyState(): S;
  createCompiler(): Promise<Compiler<API, S, Runtime>>;  // no state here
};
```

### `compileAll` (boot point)

```ts
async function tie(compiler, state) {
  let runtime;
  const getRuntime = () => {
    if (runtime === undefined) throw new Error('called before build returned');
    return runtime;
  };
  runtime = await compiler.build(state, getRuntime);
  return runtime;
}
```

Mutable cell, lazy getter, error on premature access. Honest.

### `withSetup` — Compiler functor

With state in build, `withSetup` collapses to:
```ts
function withSetupCompiler(inner, setup) {
  return {
    api: inner.api,
    async build(state, getRuntime) {
      const runtime = await inner.build(state, getRuntime);
      await setup(runtime, state);
      return runtime;
    },
  };
}
```
Pure `Compiler => Compiler`. A thin system-level wrapper lifts it for
backward-compat (`withAuth` still works).

### `StoreAPI` — pure writes, runtime getter

```ts
interface StoreAPI {
  registerStore<T>(key, initial, sharing): void;  // just a write
}

type StoreRuntime = BaseRuntime<StoreState> & {
  getStore<T>(key: StoreKey<string, T>): Store<T>;
};
```

`useStore` is gone. Handles are never captured at registration — always
fetched at runtime via `ctx.runtime.getStore(key)`. No `BackingProxy`,
no cell, no "declare intent" phase. One operation.

### `EnvironmentAPI`

```ts
interface EnvironmentAPI {}  // empty
```

Env is constructed at build (state available), exposed only at runtime.
`ctx.runtime.environment.*` is the only way.

### `SessionAPI`

Gone. `ctx.runtime.session.*` is the only way.

### `CoreAPI<Runtime>`

Covariant in `Runtime` (the eventual full runtime). `Runtime` defaults to
`CoreRuntime`; assemblers name richer runtimes explicitly
(e.g. `createCoreSystem<CoreRuntime & EnvironmentRuntime & StoreRuntime>`).

## The result: every api is pure Bucket A/D

Following memo 03's classification:

| System | Bucket | What the api does |
|---|---|---|
| Core | A | `on`, `registerTool` — pure writes |
| Store | A | `registerStore` — pure write |
| Environment | — | empty |
| Session | — | empty |
| Dependency | D | `getX()` — stage-0 constant |

No Bucket B (description handles), no Bucket C (stage-1 resources
returned at stage-0). The Bucket-C leak that motivated the whole
exploration is structurally impossible in this shape.

## Extensions migrated to runtime access

All of these moved from "capture handle at registration" to "fetch at
runtime via ctx.runtime":

- `terminal` — `runtime.environment.terminal`
- `spawn` — `runtime.session.child()`, `runtime.session.removeSelf()`
- `filesystem/read, write, edit, glob` — `runtime.environment.filesystem`, `runtime.getStore(fileKey)`
- `web/web-fetch` — `runtime.environment.web`, `runtime.getStore(webFetchCacheKey)`
- `web/web-search` — `runtime.environment.web`
- `instructions` — `runtime.environment.filesystem`
- `conversation`, `todo`, `status` — `runtime.getStore(key)`

## What I learned

### Wins

1. **`api` is now 100% pure registration.** Every Bucket-C leak is gone
   — structurally, not by convention. The phase model matches memo 03
   exactly.

2. **Store redesign eliminates the ugliest hack.** Trial-2's
   `BackingProxy` was the cell I had just removed, spelled differently.
   Dropping `useStore` and putting `getStore` on the runtime collapses
   the Store into a one-shape: write at compile, fetch at runtime.

3. **The pattern generalises.** Every system (Core, Store, Env,
   Session, Dep) now follows the same recipe: "compile-time writes
   only, runtime owns capabilities." New systems have a decision tree
   with one answer.

4. **`withSetup` is now trivially a Compiler functor.** The fact that
   state moved into build made this mechanical. Decorators stack
   cleanly.

5. **Types tell the whole phase story.** `(state, getRuntime) => Runtime`
   is a compact statement of the phase transition. `attach?` is gone.
   `Built<RT>` is gone. The Y-combinator is just a lazy getter.

6. **`getRuntime()` throws on premature use.** Catches the misuse case
   where a handler tries to read runtime during build. No silent
   `undefined`.

### Frictions

1. **Core's compiler grew ~40 lines** wrapping each handler shape at
   build time (prompt, cancel, systemPrompt, stream observers, tool
   observers, tools). Mechanical; a helper factory would compress
   it. Kept explicit for the trial to show the cost.

2. **`as Runtime` casts** inside subsystem builds — local contributions
   typed as full Runtime. Unavoidable without a `LocalRuntime` type
   param. Pragmatic.

3. **Handlers that touch stores lose the registration-time capture
   ergonomics.** Today:
   ```ts
   const store = api.registerStore(key, ...);
   api.on('prompt', () => store.set(...));  // closure capture
   ```
   New:
   ```ts
   api.registerStore(key, ...);
   api.on('prompt', (_, { runtime }) => runtime.getStore(key).set(...));
   ```
   Slightly more verbose in each handler body, but each handler stays
   self-contained. Tradeoff acceptable.

4. **Test migration is large.** Most tests use the no-transport
   `createCoreCompiler()` overload (now removed because it couldn't
   satisfy the new `Compiler<API, S, Runtime>` shape). 221 errors
   across ~20 test files. All mechanical; didn't migrate in this trial.

### Surprises

1. **The `stores` field on StoreRuntime wasn't load-bearing.** The UI's
   `useAgentState` used `agent.stores.get(name)` — migrating to
   `agent.getStore(name)` was a 3-line change.

2. **Sessions stayed tiny.** Still ~15 lines of meaningful code. No
   extra complexity from the refactor.

3. **No fourth trial needed.** The combined renames + store redesign
   delivered a clean, small, type-correct Compiler with no hacks.

## Comparison

| | Trial 1 | Trial 2 | **Trial 3 (this)** |
|---|---|---|---|
| Late-bind | mutable cell + `attach?` | `getSelf` + BackingProxy for store | `getRuntime` only |
| api purity | A + B + C (env, store) | A + C (store proxies) | **A + D only** |
| Store handle | compile-time return | compile-time proxy | **runtime.getStore** |
| Env api | `getEnvironment()` leak | empty | **empty** |
| Session api | `session.*` leak | empty | **empty** |
| `useStore` | present | present | **deleted** |
| `withSetup` | system decorator | Compiler functor | Compiler functor |
| Code ugliness | optional `attach` | BackingProxy | **none structural** |
| Extensions migrated | bash, spawn (2) | 8 | **13** |
| Production build | clean | clean | **clean** |
| Test state | passed | broken (churn) | broken (churn) |

## Recommendation

**Ship Trial 3.** It's the cleanest algebraic statement of the phase
model. `api` = pure writes, `runtime` = all capabilities, Y-combinator
ties the knot. Every "phase leak" memo 03 named is structurally
impossible in this shape.

Remaining work is mechanical:
- Update ~20 test files (no-transport overload, store handle capture)
- Factor Core's handler-wrapping into a helper (~40 lines → ~10)
- Optional: document the rule "compile-time = pure writes, runtime =
  capabilities" in the extensions README

The insight is complete.
