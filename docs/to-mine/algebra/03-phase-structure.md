# Memo 03: Phase Structure — Staging and Two-Level Type Theory

Study notes on multi-stage programming and two-level type theory, then an application to Franklin's API surface.

Sources: Taha & Sheard *"Multi-stage programming with explicit annotations"* (TCS 2000). Annenkov, Capriotti, Kraus, Sattler *"Two-Level Type Theory and Applications"* (arXiv:1705.03307). Kovács *"Staged Compilation with Two-Level Type Theory"* (arXiv:2209.09729). Davies & Pfenning *"A Modal Analysis of Staged Computation"* (1996). MetaOCaml materials (okmij.org).

---

## 1. Why staging exists

You have a program `P` that, given inputs `a, b`, computes a result. You notice `a` is known much earlier than `b` — at startup, configuration time, compile time. Naïve execution re-does the `a`-dependent work every time. Partial evaluation / specialisation is the craft of exploiting that: produce a residual `P_a` with `a` baked in, running only on `b`.

Lineage:
- **Partial evaluation** (Jones, Gomard, Sestoft 1993) — take `P : A × B → C` and `a : A`, produce `P_a : B → C`. Binding-time annotations separate "now" (static) from "later" (dynamic).
- **Multi-stage programming** (Taha-Sheard 1997) — make the binding-time annotations first-class syntax, give them types, prove the whole thing preserves well-typedness and well-scopedness.
- **Two-level type theory** (Annenkov et al.) — structure the whole type theory into two universes; the split is at the level of *type theories* rather than syntactic tags.

What you gain from making staging explicit: you can reason about *when* something happens, the typechecker catches phase boundary crossings, stage-1 code fragments can be persisted/transported, and optimisers can attack each stage separately.

## 2. MetaOCaml basics

Three annotations:

| Syntax | Name | Intuition |
|---|---|---|
| `.< e >.` | **bracket** (quote, delay) | "Here is the *code* for `e`. Don't run it yet." |
| `.~ e` | **escape** (splice, antiquote) | Inside a bracket: "compute this now, splice the code value into the surrounding quote." |
| `Runcode.run e` | **run** | "Compile and execute this code value." |

Brackets produce `'a code`. This is a **modality** — a type constructor meaning "code that, when run, produces an `'a`".

Running example — specialising `power` to a known exponent:

```ocaml
let rec spower (n : int) (x : int code) : int code =
  if n = 0 then .< 1 >.
  else .< .~x * .~(spower (n - 1) x) >.

let power3_code : (int -> int) code =
  .< fun x -> .~(spower 3 .<x>.) >.
(* power3_code = .< fun x -> x * x * x * 1 >. *)

let power3 = Runcode.run power3_code
```

`n : int` is known now, at stage 0 — recursion happens during generation, unrolling the loop. `x : int code` is code that will compute an `int` at stage 1. Each recursive call emits one multiplication into the growing fragment.

The three moves: `.<e>.` suspends, `.~e` inside a bracket evaluates now and splices, `Runcode.run` is a one-way door from code to value.

## 3. The type-level story

This is the heart. **Types carry phase information.**

`'a code` is not the same type as `'a`. A function `int → int` and a function `int code → int code` have genuinely different meanings. The typechecker prevents using a stage-1 `int` (code) as an ordinary `int`. You must explicitly cross with `.<..>.`, `.~..`, or `run`.

Categorically: `code` is a modality, **S4 necessity `□`** specifically (Davies & Pfenning). `□A` = "a closed term of type `A`". The structural invariant is *closedness* — bracketed code cannot capture stage-0 runtime values except through well-defined channels (cross-stage persistence for ground types).

Practical moral: **`'a code` is a promise about phase, not just about shape.** `int` and `int code` agree on shape but disagree on *when*. You can't conflate them silently.

## 4. Well-formed multi-stage programs

Taha-Sheard's formalisation hinges on a *level* (stage) count:
- Every expression sits at some integer level `n`.
- Brackets `+1`; escapes `-1`.
- Level `≥ 0` always; escape-below-zero is a static error.
- Level 0 means "runnable now."

Invariants:
1. **Well-staged**: escapes never outnumber brackets on any path.
2. **Closedness at run**: only closed code values may be `Runcode.run`. Scope extrusion (a bracket captures a stage-0 binder) is a runtime error.
3. **Type preservation** across stages.
4. **Phase distinction**: stage-0 and stage-1 variables don't mix except via CSP for ground types.

## 5. Two-level type theory

2LTT originated in HoTT as a way to state meta-theorems about the theory that the theory itself can't express (e.g. semisimplicial types). Annenkov et al.'s move: **stratify into two universes**.

- **Inner / object level** (`U₀`) — the interesting, restricted theory.
- **Outer / meta level** (`U₁`) — unrestricted, UIP-satisfying, acts as internalised metatheory.

Bridge: a modality `♭` (flat) / `Lift` / `⇑`:
- Given `A : U₀`, form `⇑A : U₁`. Outer-level type of *descriptions* of inner `A`-values.
- Given `t : ⇑A`, splice `∼t : A` in appropriate contexts.

The syntax deliberately mirrors MetaOCaml brackets/escape.

### Staging reading (Kovács 2022)

- **Outer `U₁`** = compile-time / metaprogram universe. Unrestricted.
- **Inner `U₀`** = runtime universe. What actually runs. Possibly restricted (closure-free, first-order, etc.).
- **`⇑A`** = compile-time description of a runtime `A`. "A metaprogram that, when staged, yields a runtime term of type `A`."

Staging (the compilation step) is exactly "evaluate `U₁` things; replace `⇑A` values with inner `A` values." Kovács proves this correct via staging-by-evaluation.

### Why 2LTT beats stage counters

One-language systems with stage counters (MetaML) work but are syntactically fiddly. 2LTT makes the split **structural in the type theory**:
- Every type lives at one level. No level arithmetic.
- `⇑` is the only way to cross from runtime to compile-time. No silent coercion.
- Each side can have different rules.
- Conservativity theorems tell you what the inner level inherits.

For someone reasoning about "compile-time vs runtime" in an API: 2LTT is the crisp version. An API call takes/returns either a `U₁` value (description, program, registration) or a `U₀` value (realised live resource). The two are **distinguished in the type**. No relying on documentation.

## 6. Description vs realisation

This is the key concept for Franklin. Staging distinguishes two kinds of things that look similar at a call site:

- **Description** (stage 0, `U₁`, `□A`, `'a code`, `⇑A`) — a value that *represents* a resource/computation but doesn't *have* it yet. A recipe, handle, request token. Cheap. Transportable, persistable, serialisable, inspectable.
- **Realisation** (stage 1, `U₀`, `A`) — the live, acquired, effectful resource. Holds memory, file descriptors, caches. Managed, torn down, scoped.

In a well-phased system, a **registration-time** call produces descriptions, not realisations. Realisations come in a distinct startup/construction phase when the system wires descriptions together.

A call signature like:

```typescript
register(api => {
  const env = api.getEnvironment();   // returns a live Env
  api.on("start", () => env.doThing());
});
```

**is a staging violation.** `getEnvironment()` is invoked at stage 0 but returns a stage-1 value. Three bad consequences:

1. **Temporal coupling**: the live env must exist at registration time. Forces a construction order (env before extensions). You cannot register before the runtime exists.
2. **Forking / testing is hard**: no `env code` to hand a different interpreter. The stage-1 value is baked in.
3. **Persistence is impossible**: you can't serialise a registration holding a live handle. You could serialise "I need an env of shape X" (a description).

The staged alternative:

```typescript
register(api => {
  const envReq = api.requireEnvironment();          // description: "I want an Env"
  api.on("start", env => env.doThing());            // handler takes realised env at invocation
});
```

Or, if the registration body itself needs to compute with env: make the operation `env code`-polymorphic and splice when the runtime is built. **In 2LTT terms: `api.getEnvironment` should have type `⇑Env` at stage 0 and `Env` at stage 1 — but not both conflated at one call site.**

## 7. Effect / capability typing

Staging is one of several techniques for carrying non-shape information. Adjacent:

- **Algebraic effects + handlers** (Plotkin-Pretnar; Koka, Eff, OCaml 5) — computations typed `A ! {e1, e2}`. What you do (`A`) is separated from the environment required (`e`s). Handlers supply interpretations.
- **Capability passing** — access to a resource = possession of a value of the resource's type.
- **Indexed / graded monads** — `M e a` where `e` tracks what's required or produced.

Crudely: **effects index what you can do; stages index when you do it.** A modern plugin architecture wants both — effect types for capability requirements, staging for registration-vs-realisation.

---

## 8. Applied to Franklin

Every method on a Franklin `api` can be classified into one of four phase/effect buckets:

| Bucket | What it is | Example methods |
|---|---|---|
| **A: stage-0 pure registration** | Returns `void`. Appends to the compiler's accumulator. Pure in the staging sense — a "write" into stage-0 state. | `api.on(event, handler)`, `api.registerTool(spec, execute)` |
| **B: stage-0 description returning a description-handle** | Returns a handle whose semantics are "a description/reference to something that will be realised later." Slightly grey. | (none currently — this is the missing category) |
| **C: stage-0 returning a stage-1 live resource** | Returns a live, stateful, resource-holding value **during registration time**. Phase leak. | `api.getEnvironment()`, `api.registerStore(...)` (returns `Store<T>`) |
| **D: stage-0 returning a stage-0 constant** | Returns a value fixed before the compiler was even created. Arguably fine; the "value" is really a constant from an outer scope. | `api.getDependency()` |

The smell is that buckets A, C, D currently share the same type shape — methods on `Compiler.api`. The types don't distinguish phase. The code relies on cultural convention (the README's "capture a local binding" pattern) to compensate.

### File-by-file audit

**`packages/extensions/src/systems/core/`** — `api.on(event, handler)` and `api.registerTool(spec, execute)` are bucket A. Clean. The handler is a stage-1 value (takes runtime context), but it's *carried by* a stage-0 registration call. This is the right pattern: the description says "when event fires, run this handler."

**`packages/extensions/src/systems/environment/system.ts:26-43`** — `createCompiler` calls `await factory(state.env)` and stores `env` in closure. `api.getEnvironment()` returns that live env. **Bucket C.** The env is realised *before* any extension runs. When an extension captures it at registration, it is handed a stage-1 value at stage-0. Extensions are explicitly told (in the README) to capture it into a local binding. This is the documented workaround for the missing description-handle pattern.

**`packages/extensions/src/systems/store/`** — `api.registerStore(key, initial, sharing)` both *registers* (stage-0 write into the store registry) and *returns* a `Store<T>` handle used for reading/writing. **Bucket C.** The `Store<T>` is live — you can `store.get()` and `store.set()` on it during registration, which has undefined meaning if no session exists yet. In practice extensions capture the handle and only use it inside stage-1 handlers (which run after `build()`), but nothing forces this. The type says "have at it."

**`packages/extensions/src/systems/dependency/`** — `api.getDependency()` returns the constant captured when `DependencySystem(dep)` was constructed. **Bucket D.** The dep exists before the compiler, before the runtime, before any extension. This one is cleaner because the value is a *stage-0 constant*, not a stage-1 resource. But its type shape is identical to `getEnvironment` — which is why they feel structurally the same and also why they're different in a way the types don't express.

**`packages/extensions/src/systems/sessions/api/api.ts:5`** — `api.session.createChild()` / `createFork()` return `Promise<Session<SessionRuntime<RTS>>>`. **Bucket C, with a twist.** Calling this *at registration time* would be nonsensical (you're creating a child session before the parent session is built). It only makes sense inside stage-1 handlers. Same type, different intended phase.

### The pattern

Three real classes of API operation, one syntactic shape. Types don't tell you which class a method belongs to.

**Class A (pure registration):** method `(args...) => void`, writes to the accumulator. Classical tagless-final dispatch with a writer effect.

**Class B (description handle):** method `(args...) => Handle` where `Handle` is a *reference / token / description* that's only meaningfully consumed inside stage-1 handlers. The handle should be phase-annotated: `Description<Handle>` or `⇑Handle` or some other marker.

**Class C (stage-1 resource returned at stage-0):** the current state of `getEnvironment`, `registerStore`, `createChild`. The typechecker thinks you got a real value; the cultural rule is "only use it inside a stage-1 handler." Every C-class method is a phase leak waiting to be invoked incorrectly.

**Class D (stage-0 constant):** the current state of `getDependency`. Fine as-is, but structurally confusable with C.

### What a fix looks like, abstractly

Two directions. Either is defensible; they have different trade-offs.

**Direction 1: phase-annotated handles.** Introduce a marker type `Deferred<T>` or `Resource<T>` that represents "a description at registration time that will be realised at runtime." Extensions receive `Deferred<Env>` from `api.requireEnvironment()`, store the deferred reference, and access the env only inside handlers via a stage-1 dereference. In tagless-final terms: the `repr` for stage-0 is `Deferred<_>`, and the `repr` for stage-1 is the underlying resource. Two interpreters on the same signature.

**Direction 2: continuation-style registration.** Registration takes a stage-1 continuation. `api.withEnvironment(env => { ... })` where the callback body runs at stage 1 and the lambda binds the env there. This is the algebraic-effects / handler-style approach. Cleaner typing, but more invasive to the extension authoring style.

Memo 05 evaluates which direction Franklin should go.

## 9. The three core operators through the phase lens

For the operators listed in memos 02 and 04:

- **`combine(sysA, sysB)`** is a stage-0 operation on stage-0 descriptions (compilers). Its output is a stage-0 compiler. No phase crossing.
- **`SessionSystem(sys)`** is a stage-0 transformer on stage-0 systems. The stage-1 `session.child()` operation lives in the runtime it builds — so the transformer adds stage-1 capabilities but the composition itself is stage-0.
- **`withSetup(sys, f)`** is stage-0 in its type but the callback `f` runs at a peculiar "stage 0.5" — after `build()`, before the runtime is handed to the caller. It's *between* stages. This is why it's invisible in the type algebra: the language has two stages and `withSetup` lives in a seam between them.

The seam isn't necessarily wrong, but it deserves a name. Memo 04 discusses.

## 10. Glossary

- **Stage / phase** — a level in the generation hierarchy. Stage 0 = "run now" (generator); stage 1 = "the produced artefact."
- **Modality** — a type constructor `M : Type → Type` with structural interpretation. `□A` in S4; `⇑A` in 2LTT. Not the same as a monad — modalities often have both intro and elim rules constrained by the logic, and are sometimes comonadic or S4-flavoured.
- **Code type** — concrete reification of the modality: `'a code` (MetaOCaml), `Code a` (TH), `Expr[A]` (Scala).
- **Bracket / escape / run** — introduction of `□`, elimination of `□` within a bracket, and the extraction operation (legal only for closed code).
- **Object language vs metalanguage** — the metalanguage (outer, `U₁`) manipulates fragments of the object language (inner, `U₀`).
- **Two-level** — exactly two stages. Common case: compile time and runtime.
- **Cross-stage persistence (CSP)** — the mechanism by which a stage-0 value can be referenced inside a bracket. Requires representable / serialisable types.
- **Closedness** — a code value has no free variables. `run` requires closed code.
- **Scope extrusion** — the failure mode where a bracket captures an outer stage-0 binder that won't exist at run time. MetaOCaml detects this dynamically and raises.
- **Futamura projections** — (1) specialise interpreter to program = compile; (2) specialise specialiser to interpreter = compiler generator; (3) self-specialise = compiler-compiler generator. Classical backdrop.
- **Description** — a stage-0 value representing a stage-1 resource.
- **Realisation** — the stage-1 resource itself.
