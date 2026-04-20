# Memo 07 — Final Insights, Traceback, and Reproduction Guide

The point of this memo is to capture everything we learned across the
exploration in one place: the final shape of the algebra, the
decision-by-decision trail that led there, a slow mapping from the
research memos (01–05) onto the final types, and a reproduction guide
for rebuilding the change on a fresh branch.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [The starting problem](#2-the-starting-problem)
3. [Conversation timeline — every decision, why](#3-conversation-timeline--every-decision-why)
4. [The final types, annotated](#4-the-final-types-annotated)
5. [Research → final: algebra mapping](#5-research--final-algebra-mapping)
6. [On `RuntimeSystem` — do we still need it?](#6-on-runtimesystem--do-we-still-need-it)
7. [Reproduction guide](#7-reproduction-guide)
8. [Open questions / next steps](#8-open-questions--next-steps)

---

## 1. Executive summary

Franklin's extension algebra started as **tagless-final with a
registration writer** and **a phase leak** (live runtime resources
handed out at registration time). Five design memos named the leak
(memo 03), put it in the right formal frame (staging / two-level type
theory), and proposed a `Deferred<T>` modality. We ended up somewhere
cleaner than `Deferred<T>`: by splitting the Compiler's phases in the
type and pushing all stage-1 capabilities onto the runtime itself, the
leak becomes **structurally impossible** — no modality needed.

The arrival point:

```ts
// The algebra — two types, one boot function
type Compiler<API, S, Runtime> = {
  readonly api: API;
  build(state: S, getRuntime: () => Runtime): Promise<Runtime>;
};

type RuntimeSystem<S, API, Runtime extends BaseRuntime<S>> = {
  emptyState(): S;
  createCompiler(): Promise<Compiler<API, S, Runtime>>;
};

async function compileAll<API, S, Runtime>(
  compiler: Compiler<API, S, Runtime>,
  extensions: Extension<API>[],
  state: S,
): Promise<Runtime> {
  for (const ext of extensions) ext(compiler.api);
  let runtime: Runtime | undefined;
  const getRuntime = (): Runtime => {
    if (runtime === undefined) throw new Error('read before build returned');
    return runtime;
  };
  runtime = await compiler.build(state, getRuntime);
  return runtime;
}
```

Every api (Core, Store, Env, Session, Dependency) is **pure
registration** (Bucket A of memo 03, or Bucket D = stage-0 constants for
Dependency). All stage-1 capabilities — env, stores, session ops, the
tracker, prompt/cancel, etc. — live on the Runtime. Handlers receive
the full Runtime as their trailing argument:

```ts
api.registerTool(fooSpec, async (args, runtime) => {
  const out = await runtime.environment.terminal.exec(...);
  const store = runtime.getStore(someKey);
  const child = await runtime.session.child();
  // ...
});
```

The **Y-combinator** (`getRuntime: () => Runtime`) is how handlers
reference the runtime that hasn't been constructed yet at registration
time. No mutable runtime cell, no `attach` side channel, no
`Deferred<T>` wrapper — the recursion is structural.

---

## 2. The starting problem

The exploration memos had already pinpointed the issue. Condensed:

- `Compiler<TApi, TResult>` exposed both `api` (what extensions wrote
  to) and `build()` (what produced the runtime). `api` was typed as a
  structural record, but different systems used their `api` for
  genuinely different things:
  - **Core's** `api.on(...)` / `api.registerTool(...)` were pure writes
    into hidden accumulators.
  - **Environment's** `api.getEnvironment()` handed back a *live,
    stateful, stage-1 resource* at registration time.
  - **Store's** `api.registerStore(...)` returned a `Store<T>` handle
    that was also stage-1 (.get / .set semantics only make sense at
    runtime).
  - **Sessions's** `api.session.*` was worse: calling it at
    registration time was nonsensical; the only meaningful use was
    inside handlers.
- Memo 03 called these **Bucket C leaks**: stage-0 api calls returning
  stage-1 resources. The README compensated with a cultural rule
  ("capture the handle into a local binding"), which is exactly the
  kind of convention a type system should make unnecessary.
- Memo 05 recommended introducing a `Deferred<T>` modality
  (description handle) so `api.requireEnvironment()` returned
  `Deferred<Env>` — a stage-0 *description* that would be realized at
  stage 1.

Everything below is the refactor that replaced `Deferred<T>` with a
simpler, structural answer: **stop returning stage-1 values from the
api at all. Expose them on the runtime.**

---

## 3. Conversation timeline — every decision, why

This is the "show the reasoning" trace so the same conclusion can be
rederived if we ever doubt it.

### T1. Initial ask

User: plan a change to `CoreAPI` so the full RT is passed into the
handler context. Specifically: refactor `bashExtension` so that
instead of `const terminal = api.getEnvironment().terminal` at
registration, it does `runtime.environment.terminal` from inside the
tool execute.

### T2. First plan (Trial 1): `Built<RT>` + `attach`

**What I proposed:** make `CoreAPI<RT>` generic in the eventual full
runtime; have handlers take a `HandlerCtx<RT>` trailing argument; tie
the knot via a post-combine `attach` method on Compiler.

```ts
type Compiler<TApi, TResult> = {
  api: TApi;
  build(): Promise<Built<TResult>>;
};
type Built<RT> = { runtime: RT; attach?(combined: unknown): void };
```

**Why this shape:** extensions need a value for runtime at invocation
time, but that value doesn't exist at registration time. A mutable
runtime cell (inside Core's compiler) holds the reference; `attach`
populates it after `combineRuntimes` produces the final RT.
`compileAll` is the boot point — calls `build`, then calls `attach`.

**User pushback, right away:**
- "`BashExtension` should not be generic — should just be
  `Extension<CoreAPI<EnvironmentRuntime>>`." **Why:** covariance of
  `CoreAPI<RT>` in RT means a richer combined runtime is assignable; no
  need to parameterize the extension.
- "Can we use `WithContext<H, T> = (...H's Parameters + T?)`, so
  handler types don't need to change?" **Why:** avoids churning every
  handler type; TypeScript's argument-width subtyping means extensions
  that ignore the trailing arg still typecheck.
- "Alternatives to `bindRuntime`?" **Why:** the optional mutation
  method on Compiler is ugly; the recursion should be structural.

### T3. Three alternatives considered

I laid out:
- **(A)** optional `attach?` on Compiler (my proposal)
- **(B)** `build()` returns `{runtime, attach?}` (`Built<RT>`)
- **(C)** `this`-based dispatch — combined runtime's methods see
  itself via `this`, `combineRuntimes` preserves bindings

**Decision:** B — phase-visible in the type, sequencing enforced,
less fragile than C's `this`-discipline. Shipped this as Trial 1.

### T4. User: split Compiler into more stages?

User asked: can we split Compiler into more explicit phases, and does
that simplify SessionSystem?

**What I proposed:** a four-slot Compiler:

```ts
type Compiler<TApi, TConstants, RT> = {
  api: TApi;                   // Phase 0a: writes (Bucket A)
  constants: TConstants;       // Phase 0b: stage-0 constants (Bucket D), auto-merged into api AND runtime
  build(): Promise<{ runtime: RT; attach?(unknown): void }>;
};
```

The idea: `SessionSystem` currently echoes `session: {...}` into both
`api` (so extensions could call `api.session.createChild()`) and
`runtime` (so handlers could call `runtime.session.child()`). That
echo is exactly a Bucket-D constant pattern. With a `constants` slot,
`combine` auto-merges into both sides; SessionSystem becomes trivial.

**User pushback:** "I'm uncertain about why we need `TConstants`?
Stuff that's in 'compile time and runtime' is never going to be used
UNTIL runtime. Basically compile time is pure registration, runtime is
execution."

**This was the sharpest correction of the entire exploration.** I was
preserving a vestigial leak: `session.createChild()` technically *was*
a stage-0 constant, but it was *never meaningfully invoked at stage
0*. The only legitimate callers were stage-1 handlers. So exposing it
at api-time was a Bucket-C-in-Bucket-D's-clothing leak. Same for
`getDependency`, same eventually for everything in the "both phases"
category.

**Decision:** no `TConstants`. Everything with a stage-1 use-site
lives on the runtime. The api is pure registration.

### T5. Trial 2: `attach` + state-in-build + Y-combinator

User accepted that plan and added: state in build, `withSetup` as a
Compiler functor. I worked through:

1. `Compiler<API, S, Self>` with `build(state, getSelf): Promise<Self>`.
2. No more Built wrapper — the lazy `getSelf` IS the binding mechanism.
3. State in `build` means withSetup becomes `Compiler => Compiler`
   (state is available to the decorator).
4. With state-in-build, `EnvironmentAPI.getEnvironment()` can't be
   supported (env factory needs state, which only arrives at build).
   So removed it. Migrated 8 extensions to `ctx.runtime.environment.*`.

**Remaining ugliness:** Store. `api.registerStore` returned a
`Store<T>` handle at registration (Bucket C). With state-in-build, the
registry couldn't be seeded until build — so I introduced a
`BackingProxy<T>` pattern. The handle was handed out at registration
with no real backing; build populated it. **This was the cell I'd
just removed, spelled differently.**

### T6. User's insight on Store

User: "We might be able to solve the Store issue by making the api
just `registerStore`, and the runtime is where you `getStore`...
Actually you also don't need `useStore` to register interest — just
`runtime.getStore` should be fine? This simplifies StoreAPI
tremendously."

**This was the second sharpest correction.** The reason the Store was
hard was that I was preserving the idea that api returns a handle. Once
you accept the rule "api is pure writes, runtime is everything else,"
the Store redesigns itself:

- `StoreAPI.registerStore(key, initial, sharing): void` — just
  accumulates a declaration.
- `StoreRuntime.getStore(key): Store<T>` — looked up at invocation
  time.
- No `useStore` — if you need a store, you `getStore` it at runtime.
  If it wasn't registered, you get a runtime error (clean failure
  mode).

**Decision:** adopt. This eliminates the `BackingProxy` and makes every
api in the system follow the same rule.

### T7. User's final rename: `Self` = `Runtime`, `ctx` = Runtime itself

The Y-combinator context was internally named `Self` to highlight its
self-referential nature. The user pointed out: `Self` *is*
`Runtime`. Cosmetic rename — keeps the mechanism, drops the confusing
name.

And the handler context `HandlerCtx<Runtime> = { runtime: Runtime }`
is just a wrapper around Runtime. Since every handler unwraps it the
same way, **drop the wrapper**. Handlers receive `Runtime` directly:

```ts
async (args, runtime) => { runtime.environment.foo; ... }
```

Removes one layer of indirection at every call site.

### T8. Trial 3 (shipped state)

After all of the above:

- `api` is 100% pure registration (Bucket A) or stage-0 constants
  (Bucket D for Dependency).
- `runtime` is where everything useful lives.
- `Compiler<API, S, Runtime>` has two members (`api`, `build`).
- `build(state, getRuntime): Promise<Runtime>` — Y-combinator in the
  signature.
- No `Built<RT>`, no `attach`, no `HandlerCtx`, no `BackingProxy`, no
  `useStore`, no `getEnvironment`, no `api.session.*`.
- 13 extensions migrated.
- `withSetup` is a pure `Compiler => Compiler` functor, lifted to
  system level by a thin wrapper.

---

## 4. The final types, annotated

### 4.1 `Compiler`

```ts
type Compiler<API, S, Runtime> = {
  readonly api: API;
  build(state: S, getRuntime: () => Runtime): Promise<Runtime>;
};
```

Three params:
- `API` — the *signature* of the registration surface (pure writes).
- `S` — the state schema this compiler consumes.
- `Runtime` — the eventual fully-tied runtime handlers receive.

Two members, three phases:
- `api` — **Phase 1 (registration).** Extensions call methods on
  `api` to accumulate closures/data. No return values that matter at
  runtime.
- `build(state, getRuntime)` — **Phase 3 (build + bind).** Given state
  and a lazy getter for the eventual Runtime, construct and return the
  runtime fragment this compiler contributes. Handler closures stored
  during Phase 1 are *wrapped here* to close over `getRuntime`.
- **Phase 2 (registered data)** is implicit — lives in compiler
  closures. Could be made explicit but buys nothing at the type level.

### 4.2 `RuntimeSystem`

```ts
type RuntimeSystem<
  S extends BaseState,
  API extends BaseAPI,
  Runtime extends BaseRuntime<S>,
> = {
  emptyState(): S;
  createCompiler(): Promise<Compiler<API, S, Runtime>>;
};
```

The system-level composition unit. Two members:
- `emptyState()` — the default state shape (system-level schema).
- `createCompiler()` — async factory for a **fresh** compiler. "Fresh"
  is load-bearing: each call produces independent accumulators, so
  multiple sessions per system don't share registrations.

### 4.3 `compileAll` — the boot point

```ts
async function compileAll<API, S, Runtime>(
  compiler: Compiler<API, S, Runtime>,
  extensions: Extension<API>[],
  state: S,
): Promise<Runtime> {
  for (const ext of extensions) ext(compiler.api);
  let runtime: Runtime | undefined;
  const getRuntime = (): Runtime => {
    if (runtime === undefined) {
      throw new Error(
        'getRuntime() called before build returned — handlers must only read runtime at invocation time, not during build',
      );
    }
    return runtime;
  };
  runtime = await compiler.build(state, getRuntime);
  return runtime;
}
```

This is the **Y-combinator** in code:
- Declare a mutable `runtime` cell.
- Pass a lazy getter that reads the cell to `build`.
- `build` populates the cell by returning Runtime.
- Handlers close over `getRuntime` during build; when they fire later
  (after this function has returned), the cell is populated.

Throws if a handler tries to read `runtime` *during* build (e.g. a
setup callback that tries to use the half-built runtime recursively).
Good fail-fast.

### 4.4 `combine` (compiler-level)

```ts
function combine<API1, API2, S, Runtime>(
  c1: Compiler<API1, S, Runtime>,
  c2: Compiler<API2, S, Runtime> & AssertNoOverlap<API1, API2>,
): Compiler<API1 & API2, S, Runtime> {
  return {
    api: { ...c1.api, ...c2.api },
    async build(state, getRuntime) {
      const [r1, r2] = await Promise.all([
        c1.build(state, getRuntime),
        c2.build(state, getRuntime),
      ]);
      return { ...r1, ...r2 } as Runtime;
    },
  };
}
```

- **APIs** merge structurally (disjointness enforced).
- **Both children** see the *same* `getRuntime` — the lazy getter for
  the full combined Runtime. By the time any child's handlers fire,
  `getRuntime()` returns the union.
- **Runtime contributions** merge by object spread.
- Same state `S` for both children (system-level combine is where the
  state shape merges).

### 4.5 `withSetupCompiler` — Compiler functor

```ts
function withSetupCompiler<API, S, Runtime>(
  inner: Compiler<API, S, Runtime>,
  setup: (runtime: Runtime, state: S) => Promise<void>,
): Compiler<API, S, Runtime> {
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

This is what the user meant when they said "withSetup is actually a
general Compiler=>Compiler functor in which build is decorated." It's
visible at the type level, pure `Compiler<API, S, Runtime> =>
Compiler<API, S, Runtime>`. State is available because state is in
build.

### 4.6 `CoreAPI<Runtime>`

```ts
interface CoreAPI<Runtime = CoreRuntime> {
  on(event: 'prompt',   handler: WithContext<PromptHandler,   Runtime>): void;
  on(event: 'cancel',   handler: WithContext<CancelHandler,   Runtime>): void;
  on(event: 'systemPrompt', handler: WithContext<SystemPromptHandler, Runtime>): void;
  on(event: 'chunk' | 'update' | 'turnEnd', handler: WithContext<StreamObserverHandler<K>, Runtime>): void;
  on(event: 'toolCall' | 'toolResult', handler: WithContext<ToolObserverHandler<K>, Runtime>): void;
  registerTool<TInput>(tool: ExtensionToolDefinition<TInput, Runtime>): void;
  registerTool<TArgs>(
    spec: ToolSpec<string, TArgs>,
    execute: (params: TArgs, runtime: Runtime) => MaybePromise<ToolExecuteReturn>,
  ): void;
}
```

Variance: `CoreAPI<RT>` is covariant in `RT`. If combined `RT_full
<: MyRT`, then `CoreAPI<RT_full> <: CoreAPI<MyRT>`, so an
`Extension<CoreAPI<MyRT>>` accepts the richer api. Extensions declare
the *minimum* runtime they need; assemblers instantiate richer.

`WithContext<H, T>`:
```ts
type WithContext<H extends (...args: any[]) => any, T> =
  (...args: [...Parameters<H>, T]) => ReturnType<H>;
```
Appends `T` to a handler signature. Used so existing handler types
(`PromptHandler`, `StreamObserverHandler`, …) don't need to change —
we just decorate at the api level.

### 4.7 `StoreAPI` + `StoreRuntime`

```ts
interface StoreAPI {
  registerStore<X, T>(key: StoreKey<X, T>, initial: T, sharing: Sharing): void;
  registerStore<T>  (name: string,         initial: T, sharing: Sharing): void;
}

type StoreRuntime = BaseRuntime<StoreState> & {
  getStore<X, T>(key: StoreKey<X, T>): Store<T>;
  getStore<T>  (name: string):         Store<T>;
};
```

The entire Store subsystem in two declarations. Compile-time: declare.
Runtime: fetch. That's it.

### 4.8 `EnvironmentAPI`, `SessionAPI`

```ts
interface EnvironmentAPI {}  // empty
// SessionAPI — deleted
```

Env and session capabilities live on `EnvironmentRuntime` and
`SessionRuntime` respectively. The api surface is empty (Env) or
nonexistent (Sessions).

### 4.9 `HandlerCtx` — deleted

The only reason `HandlerCtx<Runtime>` existed in intermediate trials
was to wrap `Runtime` in an extensibility shell for future fields
(abort signal etc). But Runtime is already a rich object — add fields
directly to it. The extra wrapper was noise at every handler site.

### 4.10 Handler shape in practice

```ts
// Today:
api.registerTool(spec, async (args, runtime) => {
  const out = await runtime.environment.terminal.exec(...);
  const store = runtime.getStore(myKey);
  const child = await runtime.session.child();
  return formatResult(...);
});
```

Runtime *is* the context. One arrow, no destructuring.

---

## 5. Research → final: algebra mapping

This section is the slow walk the user asked for — mapping the five
research memos onto concrete bits of the final code.

### 5.1 Memo 01 — Tagless Final Foundations

**What the memo establishes:**
- A `Symantics repr` class abstracts over the interpreter type `repr`.
- Programs are polymorphic over `repr`: `∀ repr. Symantics repr => repr Int`.
- Multiple interpreters can instantiate the same class, each giving
  the program different meaning (eval, view, optimize).
- Adding new operations = new class constraints (open operations
  axis). Adding new interpreters = new instances (open semantics
  axis). **The expression problem is solved both ways.**
- Symantics instances can be *combined* via the "product of
  interpreters" trick: `instance (Symantics r1, Symantics r2) =>
  Symantics (r1, r2)`. This is what lets two interpreters run on a
  single polymorphic term.

**Final-code mapping:**

| Tagless final | Franklin |
|---|---|
| `Symantics repr` class | `API` type parameter on `Compiler<API, S, Runtime>` |
| `Symantics` instance | `compiler.api` — the record of methods |
| Polymorphic term `∀ repr. repr a` | `Extension<API> = (api: API) => void` |
| `eval :: repr a -> a` | `compileAll(compiler, exts, state) : Promise<Runtime>` |
| Product of interpreters `Pair r1 r2` | `combine(c1, c2)` producing `API1 & API2` |
| "Pass term once, many interpreters" | Parametricity over `API` in `Extension<API>` |

The last row is load-bearing. The reason the "pass an extension
through a combined compiler exactly once" property works is *not* a
routing trick; it's just parametricity. An `Extension<A1 & A2>` can
only touch what `A1 & A2` exposes. Object-spread preserves method
identity, so every call resolves to exactly one sub-compiler's
accumulator. No dispatch logic needed.

### 5.2 Memo 02 — Franklin as Tagless Final

**What the memo establishes:**
- Franklin *is* tagless final — the mapping is structural, not
  analogy.
- Six smells, each a place where the mapping breaks:
  1. `api` conflates interpreter-value vs signature-type in docs.
  2. `EnvironmentAPI.getEnvironment()` returns a live runtime object
     at registration — **phase leak**.
  3. `BaseRuntime.fork()` vs `SessionRuntime.session.fork()` — same
     name, different types.
  4. `SessionSystem` is not a `combine` — it's a functor/transformer.
  5. `withSetup` is a hidden third phase, invisible in types.
  6. `ExtensionBundle` erases `TApi` to `any`.

**Where each smell landed in the final code:**

| # | Smell | Final answer |
|---|---|---|
| 1 | `api` two meanings | Unchanged — it's a naming convention, not a bug. `API` is the type, `compiler.api` the instance. |
| 2 | `getEnvironment()` leak | **Fixed.** `EnvironmentAPI` is empty; env lives on `EnvironmentRuntime`; handlers use `runtime.environment`. |
| 3 | Two fork's | Partially fixed — session ops moved off the api; runtime-level `runtime.session.child/fork` stay distinct from `BaseRuntime.child/fork`. Naming still overloaded, but no longer a conflation between api-time and runtime-time. |
| 4 | Sessions ≠ combine | Unchanged — SessionSystem is still a functor `RTS → SessionSystem<RTS>`. Memo 04 was right: this is a statement about its algebraic shape, not a bug. With session ops now runtime-only, the functor is simpler (no api echo). |
| 5 | `withSetup` hidden | **Fixed.** `withSetup` is now a visible `Compiler => Compiler` functor (`withSetupCompiler`) with a thin system-level lift. Type-visible. |
| 6 | Bundle erasure | Unchanged (scope). Remains a pragmatic leak; orthogonal. |

### 5.3 Memo 03 — Phase Structure (the key memo)

**What the memo establishes:**
- Staging / two-level type theory gives the right frame for
  compile-time vs runtime.
- Every api method falls into one of four buckets:
  - **A** — stage-0 pure registration (returns `void`). *Clean.*
  - **B** — stage-0 description handle (returns a reference to
    something realized at stage 1). *Didn't exist yet.*
  - **C** — stage-0 call returning a stage-1 live resource. *The
    phase leak.*
  - **D** — stage-0 call returning a stage-0 constant. *Benign.*
- The recommendation was to introduce a `Deferred<T>` modality to give
  Bucket-C methods a type-level annotation (Direction 1), or rewrite
  registrations as continuations (Direction 2).

**Final-code status:**

| Bucket | Before | After |
|---|---|---|
| A | `on`, `registerTool` | **All apis are A** — `on`, `registerTool`, `registerStore` |
| B | (missing) | Not needed — eliminated by making Bucket C impossible |
| C | `getEnvironment`, `registerStore` returns Store, `useStore`, `api.session.createChild` | **Gone.** Env/stores/session live on Runtime only. |
| D | `getDependency` | Still D — the one legitimate case (pre-session constant dependency injection) |

**The memo's proposed `Deferred<T>` modality is not needed** because
we didn't add a description modality — we moved the realizations to
stage 1 entirely. Cleaner outcome than the memo anticipated. The memo
considered `ctx.runtime` as "Direction 2 (continuation-style)" but
noted it was "more invasive to the extension authoring style." In
practice the invasiveness was limited: 13 extensions migrated.

The `withSetup` "stage 0.5" seam the memo called out was real; it
resolved cleanly into the `withSetupCompiler` functor (state-in-build
made this mechanical).

### 5.4 Memo 04 — Common Algebra

**What the memo establishes:**
- Three different composition shapes currently present:
  - `combine` — partial symmetric monoidal product (tensor).
  - `SessionSystem` — endofunctor/transformer `System → System`.
  - `withSetup` — monoid action (decoration).
- Memo 04 was explicit: these are three *structurally different*
  algebras. `SessionSystem` isn't a `combine` the same way `StateT`
  isn't `State × _`: its operations reference the whole system
  (self-reference/fixpoint), which combines cannot express.
- Diagnostic questions: symmetric? associative? identity? Each shape
  answers differently.

**Final-code status:**

| Memo 04 shape | Final | Laws |
|---|---|---|
| `combine` (tensor) | Unchanged: `combine(sys1, sys2)` on disjoint surfaces | Partial symmetric monoidal, associative, `{}` identity |
| Transformer (`SessionSystem`) | Unchanged shape, simplified internals: api pass-through + runtime adds session | Endofunctor `RTS → SessionSystem<RTS>`; self-referencing via `Session<SessionRuntime<RTS>>` |
| Monoid action (`withSetup`) | **Now visible in types:** `Compiler => Compiler` functor | Associative under composition, identity = no-op |

Memo 04 was *prescient*. It said: the three shapes should be named and
type-distinct rather than all returning `RuntimeSystem<S, API, RT>`.
The final code doesn't give them new top-level names, but does make
the distinctions visible: `combine` produces a product;
`SessionSystem` produces a functor with type-level self-reference;
`withSetupCompiler` is a first-class `Compiler => Compiler` value.

### 5.5 Memo 05 — Recommendation

**What the memo recommended:**
- *"Separate the compiler's two roles"* — dispatch dictionary vs
  accumulator/writer.
- Introduce `Deferred<T>` modality; split stage-0 and stage-1 methods
  by type.
- Keep tagless-final style; don't go fully algebraic-effects.
- Smallest next step: prototype `Deferred<T>` on EnvironmentAPI.

**What we actually did:**
- The "two roles" split happened implicitly: `compiler.api` is the
  dispatch dictionary; the *registered object* (mutable arrays in
  Core's compiler closure) is the accumulator. Build reads the
  accumulator plus `state` plus `getRuntime` and produces the runtime.
- The `Deferred<T>` modality was replaced by something simpler: **move
  realizations to the runtime**. A "description of a resource" at
  registration isn't needed if the resource is just fetched at runtime.
- We stayed in tagless-final. The "state-threading effect" and "handler
  closures reading a late-bound RT" that memo 05 predicted we'd need
  are both there — `state` is a parameter to `build`, `getRuntime` is
  a lazy reader.

**The key insight the memo almost made but didn't:** memo 05's
framing assumed we'd keep `api.getEnvironment()` and similar
stage-0-returns-stage-1 calls, and annotate them with a modality. But
if you accept that the *only* legitimate use of these calls is inside
stage-1 handlers, the question becomes "why is this on the api at
all?" Moving them to the runtime is strictly cleaner than annotating
them.

### 5.6 Axes table — what's now encoded in types

Memo 05 called out three axes that were cultural convention. Final
status:

| Axis | Before | After |
|---|---|---|
| **Phase** (stage 0 vs 1) | README convention | Structural: api = stage 0 (writes), runtime = stage 1 (capabilities). No method inhabits both. |
| **Composition shape** (combine / transformer / decoration) | All returned `RuntimeSystem<...>`; laws undifferentiated | `combine` produces `CombineSystems<...>`; `SessionSystem<RTS>` is a named functor; `withSetupCompiler` is a `Compiler => Compiler` value. Distinct at the type level. |
| **Effect kind** (pure write / read / effectful resource) | All apis had same shape | **api is exclusively pure writes (or stage-0 constants).** There is no other kind. |

The memo's headline ("three axes as cultural convention") is resolved.

---

## 6. On `RuntimeSystem` — do we still need it?

The user's question: can we get rid of `RuntimeSystem`?

Short answer: **no, but the concept is thinner than it looks.**

`RuntimeSystem` has two jobs today:
1. **Schema carrier:** `emptyState(): S`. System-level — the shape of
   state the system works with.
2. **Compiler factory:** `createCompiler(): Promise<Compiler<API, S,
   Runtime>>`. Each call produces a *fresh* compiler with fresh
   accumulators.

Why not just use `Compiler` directly?
- A single `Compiler` accumulates registrations in closures. If you
  used the same `Compiler` for two sessions, registrations from the
  first would leak into the second.
- So we need a factory. That's what `createCompiler` is.

Why not just `() => Promise<Compiler<...>>` instead of
`RuntimeSystem`?
- We'd lose the `emptyState` slot, which is load-bearing (`SessionManager`
  uses it to bootstrap root sessions).
- We *could* inline `emptyState` into each `Compiler` (each fresh
  compiler also exposes it), but `emptyState` is *static* in the
  system (same result regardless of which fresh compiler you make), so
  it more naturally belongs to the factory.

Possible simplifications that are really just renames:
- `RuntimeSystem` → `System` or `CompilerFactory`. Shorter, still
  expresses "schema + factory."
- Drop `BaseState extends object` / `BaseRuntime<S>` constraints where
  not needed. Low-value cleanup.
- Remove the `EmptyState` / `EmptyRuntime` types — Dependency system
  could declare `Record<never, never>` directly.

**Recommendation:** keep `RuntimeSystem` as a two-member factory.
Possibly rename to `System` in a future pass. The concept is real;
the ergonomics can be nicer.

### A speculative alternative

If we really wanted to flatten, one structure would be:

```ts
type System<API, S, Runtime> = {
  emptyState(): S;
  fresh(): Promise<{
    api: API;
    build(state: S, getRuntime: () => Runtime): Promise<Runtime>;
  }>;
};
```

which inlines `Compiler` into `System.fresh()`. Same information,
fewer type names. Cosmetic.

---

## 7. Reproduction guide

How to rebuild this change on a fresh branch. Assumes you're starting
from `main` / current state of Franklin (post this branch or a state
where `Built<RT>` + `attach` isn't yet merged).

### Build order (14 steps)

#### Algebra — 5 files

**1.** `packages/extensions/src/algebra/types/with-context.ts` (new)
```ts
export type WithContext<H extends (...args: any[]) => any, T> =
  (...args: [...Parameters<H>, T]) => ReturnType<H>;
```

**2.** `packages/extensions/src/algebra/types/index.ts`
Add re-exports for `WithContext`.

**3.** `packages/extensions/src/algebra/compiler/types.ts`
```ts
export type Compiler<API, S, Runtime> = {
  readonly api: API;
  build(state: S, getRuntime: () => Runtime): Promise<Runtime>;
};
```

**4.** `packages/extensions/src/algebra/compiler/combine.ts`
Propagate `state` and `getRuntime` to both children:
```ts
async build(state, getRuntime) {
  const [r1, r2] = await Promise.all([
    c1.build(state, getRuntime),
    c2.build(state, getRuntime),
  ]);
  return { ...r1, ...r2 } as Runtime;
}
```

**5.** `packages/extensions/src/algebra/compiler/compile.ts`
Implement the Y-combinator `tie`:
```ts
async function tie<API, S, Runtime>(
  compiler: Compiler<API, S, Runtime>,
  state: S,
): Promise<Runtime> {
  let runtime: Runtime | undefined;
  const getRuntime = (): Runtime => {
    if (runtime === undefined) throw new Error('...');
    return runtime;
  };
  runtime = await compiler.build(state, getRuntime);
  return runtime;
}

export async function compileAll<API, S, Runtime>(
  compiler: Compiler<API, S, Runtime>,
  extensions: Extension<API>[],
  state: S,
): Promise<Runtime> {
  for (const ext of extensions) ext(compiler.api);
  return tie(compiler, state);
}
```

#### System level — 4 files

**6.** `packages/extensions/src/algebra/system/types.ts`
```ts
export type RuntimeSystem<S, API, Runtime extends BaseRuntime<S>> = {
  emptyState(): S;
  createCompiler(): Promise<Compiler<API, S, Runtime>>;
};
```

**7.** `packages/extensions/src/algebra/system/combine.ts`
```ts
async createCompiler() {
  const [c1, c2] = await Promise.all([sys1.createCompiler(), sys2.createCompiler()]);
  return {
    api: { ...c1.api, ...c2.api },
    async build(state, getRuntime) {
      const [r1, r2] = await Promise.all([
        c1.build(state, getRuntime as never),
        c2.build(state, getRuntime as never),
      ]);
      return combineRuntimes(r1, r2);
    },
  };
}
```

**8.** `packages/extensions/src/algebra/system/setup.ts`
Replace the old system-level-only `withSetup` with:
- `withSetupCompiler` — the `Compiler => Compiler` functor.
- `withSetup` — thin system-level wrapper that calls
  `withSetupCompiler` inside `createCompiler`.

**9.** `packages/extensions/src/algebra/system/create.ts`
```ts
export async function createRuntime<S, API, Runtime>(
  system: RuntimeSystem<S, API, Runtime>,
  state: S,
  extensions: Extension<API>[],
): Promise<Runtime> {
  const compiler = await system.createCompiler();
  return compileAll(compiler, extensions, state);
}
```

#### Core — 3 files

**10.** `packages/extensions/src/systems/core/api/api.ts`
`CoreAPI<Runtime = CoreRuntime>` with `WithContext<…, Runtime>` around
every handler type. `registerTool` gains a `runtime` trailing
parameter in both overloads.

**11.** `packages/extensions/src/systems/core/api/tool.ts`
`ExtensionToolDefinition<TInput, Runtime>`: `execute(params, runtime)`.
Plus internal `BoundTool<TInput>` where execute is single-arg.

**12.** `packages/extensions/src/systems/core/compile/compiler.ts`
- Store raw handlers as arrays/maps (no wrapping yet).
- In `build(state, getRuntime)`: map each raw handler array to a
  wrapped version that calls `getRuntime()` at invocation:
  ```ts
  const wrappedPromptHandlers = promptHandlers.map((h) => (c) => h(c, getRuntime()));
  // ...same for each handler shape
  const boundTools = rawTools.map((t) => ({
    ...t,
    execute: (args) => t.execute(args, getRuntime()),
  }));
  ```
- Pass wrapped to `buildMiddleware` as before.

Also update `createCoreSystem<Runtime extends CoreRuntime = CoreRuntime>`.

#### Sessions — 3 files

**13.** `packages/extensions/src/systems/sessions/*`:
- Delete `SessionAPI`.
- System's `createCompiler` returns `{ api: base.api, build(state,
  getRuntime) { const baseRt = await base.build(state, getRuntime);
  return { ...baseRt, session: sessionOps }; } }`.
- `SessionManager`'s `extensions` param loses `& SessionAPI<…>`.

#### Environment — 3 files

**14a.** `EnvironmentAPI` → empty interface.

**14b.** `environment/system.ts`: `createCompiler()` returns a compiler
whose `build(state)` calls `factory(state.env)` and returns runtime.
Factory moves out of `createCompiler`.

**14c.** `environment/compile/compiler.ts`: also returns state-in-build
shape.

#### Store — 3 files

**15a.** `StoreAPI` → only `registerStore(key, initial, sharing):
void`. Delete `useStore`.

**15b.** `StoreRuntime` → add `getStore<X, T>(key): Store<T>` +
`getStore<T>(name): Store<T>`.

**15c.** `store/compile/compiler.ts` → `createStoreCompiler(registry)`;
api.registerStore pushes to a declarations array. Build reads
declarations, seeds registry from `state.store`, returns runtime.

#### Extensions — 13 files

**16.** Migrate every extension that used `api.getEnvironment()`,
`api.useStore()`, or captured a `registerStore` return value:
- `bash`, `spawn` — already use `runtime.*`
- `filesystem/read, write, edit, glob` — env and/or store via runtime
- `web/web-fetch, web-search` — env and/or store via runtime
- `instructions` — env via runtime
- `conversation`, `todo`, `status` — store via runtime

Pattern: every extension becomes
```ts
function myExt(): Extension<CoreAPI<MyRuntime> & ...> {
  return (api) => {
    api.registerStore(key, initial, 'private');  // pure write
    api.registerTool(spec, async (args, runtime) => {
      const store = runtime.getStore(key);
      // ... use store
    });
  };
}
```

#### UI — 1 file

**17.** `packages/ui/react/src/agent/use-agent-state.ts`: replace
`agent.stores.get(name)` with `agent.getStore(name)`.

#### Top-level exports

**18.** `packages/extensions/src/index.ts`: remove
`SessionAPI`/`useStore`-related exports; add `withSetupCompiler`
export if desired.

### Verification

- `npm run build` should complete with **only test-file errors**.
- Production code (every file except `__tests__`) should be clean.
- `npm run lint` — clean.
- `npm run test -w @franklin/extensions` — test files need migration;
  see "open work" below.

### Test migration (deferred)

~20 test files break mechanically:
- Tests that called `createCoreCompiler()` with no transport — the
  overload is gone. Port to either `createCoreCompiler(mockSpawn)` or
  test middleware construction separately.
- Tests that did `const store = api.registerStore(key, ...)` followed
  by closure use — port to `const runtime = ...; runtime.getStore(key)`
  inside handlers, or construct compiler+build-with-state directly.
- Tests that did `await compiler.build()` (no state) — now
  `await compiler.build(state, getRuntime)` or go through
  `createRuntime(system, state, extensions)`.

None of this requires new semantics — just threading state and
`runtime` through test scaffolding.

---

## 8. Open questions / next steps

1. **Rename `RuntimeSystem` → `System`?** Cosmetic; shorter; reads
   well. Consider with the test migration PR.

2. **Factor Core's handler wrapping.** ~40 lines of nearly-identical
   `.map(h => (c) => h(c, getRuntime()))` per handler shape. Could be
   a helper:
   ```ts
   function bindRuntime<H extends (...a: any[]) => any, R>(
     handlers: H[],
     getR: () => R,
   ): ((...a: Parameters<H>) => ReturnType<H>)[] { ... }
   ```
   Cosmetic, saves ~30 lines.

3. **Revisit `LocalRuntime` vs `Runtime` typing.** Subsystem builds
   currently return `Runtime` (the full union) but the value contains
   only the local contribution; the `as Runtime` cast is the tell.
   A fourth type param `LocalRuntime` could make this honest at the
   cost of more verbosity. Probably not worth it, but worth noting.

4. **Document the one rule.** The phase story collapses to a single
   sentence that every new system author needs to internalize:
   > **Compile-time api is pure registration; the runtime is where
   > every capability lives. If you're tempted to return a handle from
   > an api method, put it on the runtime instead.**
   This belongs in the extensions README.

5. **Consider a `Dependency` makeover.** `getDependency()` on the api
   is the last Bucket-D. Could also move to runtime
   (`runtime.getDependency(name)`) for uniformity. Not strictly
   necessary — stage-0 constants are legitimate — but would make every
   api **100% Bucket A** with zero exceptions. Symmetry argument.

6. **Bundle erasure.** `ExtensionBundle.extension: Extension<any>`
   loses the `API` parameter. Orthogonal to this refactor but worth
   addressing when we touch bundles again.

7. **Persistence.** With the api being pure data, extensions are now
   *almost* serializable (the tools/handlers are functions, which
   aren't — but their declarations are data). If we ever want
   transportable extensions, this is the foundation. Not in scope.

---

## Summary of what changed (for `git log` / PR)

- **Deleted:** `HandlerCtx`, `SessionAPI`, `useStore`,
  `EnvironmentAPI.getEnvironment`, no-transport overload of
  `createCoreCompiler`, `Built<RT>`, `attach`.
- **Added:** `WithContext<H, T>`, `withSetupCompiler`,
  `StoreRuntime.getStore`, Y-combinator `compileAll`.
- **Changed:** `Compiler<API, S, Runtime>` (3 params, state+getRuntime
  in build); `RuntimeSystem<S, API, Runtime>` (no state in
  createCompiler); `CoreAPI<Runtime>` (generic in eventual Runtime);
  `StoreAPI` (only `registerStore`, `void` return); 13 extensions.

Production code: clean. Tests: need mechanical migration (~20 files).
