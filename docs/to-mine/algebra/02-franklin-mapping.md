# Memo 02: Franklin as Tagless Final (a first mapping)

**Working thesis: Franklin's extension system is tagless final with staging, implemented as a side-effecting interpreter.** This memo draws the mapping, shows where it's exact, and calls out the places the mapping frays — those fractures point at the things we want to clean up.

Uses vocabulary from memo 01.

---

## 1. The core correspondence

| Tagless final | Franklin | File reference |
|---|---|---|
| `repr` type variable | `TApi` type parameter | `packages/extensions/src/algebra/types/extension.ts:4` |
| `Symantics repr` class | `TApi` structural type (`BaseAPI = object`) | `.../algebra/api/types.ts:8` |
| Polymorphic term `Symantics repr => repr Int` | `Extension<TApi> = (api: TApi) => void` | `.../algebra/types/extension.ts:4` |
| `Symantics` instance | `Compiler<TApi, TResult>` + its `api` field | `.../algebra/compiler/types.ts:11` |
| `eval` / `view` observation | `compiler.build()` | same |
| Product of instances (`Pair r1 r2`) | `combine(c1, c2)` producing `A1 & A2` | `.../algebra/compiler/combine.ts:11` |
| Add a new class (expression-problem extension) | Add a new `System` whose API joins by intersection | — |

Read this row-by-row:

- An extension is a polymorphic "term" parameterised over the API signature.
- The compiler is an "instance" of that signature paired with a build step.
- `combine` is the product-of-instances trick that lets two interpreters run on one term.
- A new system (Environment, Store, Sessions, Dependency) is the tagless-final *"add a new class"* move, which the literature says is the whole point of the style.

This is not a rough analogy. The mapping is structural. Franklin descends from tagless final whether we labelled it so or not, and the literature applies directly.

## 2. Why "pass extension once, join APIs" falls out

The central property the code rests on — a combined compiler has `api = {...c1.api, ...c2.api}`, and a single extension visits the merged surface in one pass — **is not a clever implementation trick. It is parametricity.**

If `extension : Extension<A1 & A2>`, then by parametricity the extension can only use what the intersected signature provides. Object-spread preserves method identity, so every call on `api.foo()` lands on exactly one sub-compiler's accumulator. No routing logic needed; it's just scope resolution on the merged record.

This is exactly the `Pair r1 r2` move from memo 01 §5 — we instantiate a new interpreter that dispatches each method to one of two underlying instances. In Franklin the dispatch is even simpler because each method exists on *only one* side (the `AssertNoOverlap<A1, A2>` guard at `algebra/compiler/combine.ts:11` enforces disjointness).

The property generalises: adding a new system `S3` cannot break existing extensions, because `Extension<A1 & A2>` is automatically an `Extension<A1 & A2 & A3>` by intersection subtyping. **Signature-enlargement is free.** This is the Wadler expression-problem property we wanted — the "new column" axis stays open forever.

## 3. The compiler's dual nature

Here the mapping is less clean, and this is where most of Franklin's conceptual weirdness lives.

In textbook tagless final an interpreter is **pure**: `Symantics R` is a record of pure functions. `lit 3 :: R Int` simply wraps `3`. There is no accumulation; the interpreter is not "building something up as terms arrive."

Franklin's compiler is not pure. It is a **mutable accumulator behind a typed interface**. When an extension calls `api.on("start", handler)`, the interpreter doesn't *return* an interpretation of that call — it *appends* to a closure-captured array. The final result — the `Runtime` — is produced by `compiler.build()`, which reads the accumulated state.

So the compiler is a fusion of two things:

1. An **interpreter** in the classical sense — a dictionary that dispatches method calls.
2. A **writer monad / effectful builder** — records every dispatch into hidden state.

The type `Compiler<TApi, TResult>` witnesses only role (1). The `api: TApi` field advertises the dispatch surface. Role (2) — the mutation — is entirely untyped, lives in closures, and is governed by the README's "authoring rules" as cultural convention patching the missing type-level information.

This is a real mismatch. Every confusion in the current codebase (env leak, store-handle leak, session self-reference) is downstream of this. Memo 03 explains why in staging terms.

## 4. Where the tagless-final map breaks

### 4a. Extension returns `void`, not a value

`Extension<TApi> = (api: TApi) => void`, not `∀ repr. Symantics repr ⇒ repr Int`. There is no "result" produced by evaluating a term; all effect is carried by what the extension does to `api`. This is fine — it matches the "program that registers capabilities" framing — but it means the "term" is pure procedure and all the *interpretation* lives in how the dispatch mutates state. The tagless-final literature is usually pitched at term-returning programs; plugins are term-executing programs.

### 4b. `TApi` methods are not uniform in return type

In classical Symantics, every method returns a `repr a` for some `a`. In Franklin, different api methods have wildly different return shapes:

| Method | Return | Nature |
|---|---|---|
| `api.on(event, handler)` | `void` | pure registration (writer effect) |
| `api.registerTool(spec, execute)` | `void` | pure registration |
| `api.registerStore(key, initial, sharing)` | `Store<T>` | **live handle** |
| `api.getEnvironment()` | `ReconfigurableEnvironment` | **live resource** |
| `api.session.createChild()` | `Promise<Session<...>>` | **live subsystem** |
| `api.getDependency()` | `T` | **captured singleton** |

The first two look like term-construction (append to accumulator — pure writer). The last four look like **observations on an already-constructed interpreter**. That is structurally the same as calling `eval` in the middle of building a term — a phase confusion that memo 03 diagnoses through staging. The whole "different api methods belong to different phases" problem is visible right here in this table.

### 4c. `RuntimeSystem` is a family of interpreters, not one

A `RuntimeSystem<S, API, RT>` has `createCompiler(state: S): Promise<Compiler<API, RT>>`. It isn't one interpreter; it's a **state-indexed family of interpreters**. Each session call materialises a fresh compiler with per-session closed state.

In tagless-final language: instead of `instance Symantics MyRepr`, we have `makeRepr :: s -> instance of Symantics (MyRepr s)` — an explicit factory producing instances parameterised by `s`. This is legitimate — reader-over-tagless-final — but it is not the textbook case, and textbooks don't usually cover it. The combination of `createCompiler` (factory) + parametric extension + per-session state is essentially **a tagless-final interpreter living in a reader monad over state**.

### 4d. `SessionSystem` is the "new class" axis (expression-problem in the operations direction)

This is the axis to celebrate. In tagless final, adding a new class `MulSYM` on top of `Symantics` is *how you solve the expression problem in the operations direction* (memo 01 §3). Old terms unaffected; new terms opt in via a new constraint.

`SessionSystem<RTS>` is exactly this move. It takes any `RTS` and produces a system whose `api` satisfies `InferAPI<RTS> & SessionAPI<RTS>`. Extensions not using sessions are unchanged. Extensions needing sessions pick up the constraint.

The asymmetry with `combine` is **not a bug** — it's the second Wadler axis. `combine` is the *column* extension (new independent columns joined side-by-side). `SessionSystem` is the *row* extension (a new class of operations added over the same state shape).

But the mapping doesn't fully explain the *self-reference* in `SessionRuntime.session.child(): Promise<Session<SessionRuntime<RTS>>>` (`.../systems/sessions/runtime/runtime.ts:8`). That's not a tagless-final operation; that's a **recursive transformer**. A session operation that produces another full system-with-sessions is a fixpoint:

```
SessionSystem RTS = RTS ⊕ SessionAPI ⊕ (ops returning SessionSystem RTS)
```

This shape is natural in:
- **Algebraic effects** — handlers that resume continuations with the same effect signature.
- **Comonadic context propagation** — sessions as a cofree-like tree where each node is itself a full context.
- **Monad transformers** — `StateT s m` where some operations in the `State` signature require access to the outer transformed monad.

Memo 04 takes this up in detail. For here, note: SessionSystem is *not* purely a tagless-final "new class" — it has a recursive structural feature that pure tagless-final doesn't need. It's "tagless-final + fixpoint."

### 4e. `ExtensionBundle.extension: Extension<any>` erases the `TApi` parameter

Every use of `Extension<TApi>` in the algebra preserves the `TApi` parameter for type-checking at composition sites. Bundles don't — they collapse it to `any`. This means a bundled extension loses the guarantee that its required capabilities are actually present in the composed system. The bundle abstraction is below the tagless-final abstraction and leaks.

Probably worth fixing, but it's a pragmatic issue, not a conceptual one. Flagging.

## 5. Reading the smell list from the initial exploration through this lens

The exploration memo listed six "smells." The mapping now tells us what each one *is* in the tagless-final picture:

| Smell (from exploration) | Tagless-final reading |
|---|---|
| `api` means two things (compile-time value vs shape) | The `Compiler.api` field is the **Symantics record**; `TApi` is the **Symantics class/signature**. Standard tagless-final keeps these distinct — we conflate them in docs. |
| `EnvironmentAPI.getEnvironment()` returns a live runtime object | **Phase leak**: a method on the Symantics record is returning a value from a different `repr` — there's no single-repr interpretation that makes this type-correct. See memo 03. |
| `BaseRuntime.fork()` returns `S`; `SessionRuntime.session.fork()` returns a `Session` | Two different `repr` choices, same method name. Not an error but an indication we have multiple interpreters with partially overlapping surfaces and we haven't distinguished them. |
| `SessionSystem` isn't a `combine` | Correct — it's the "new class" axis, not the "product of instances" axis. See §4d. |
| `withSetup` is a hidden third phase | Outside the tagless-final story entirely. Memo 04 classifies it as a *monoid action* on systems. |
| `ExtensionBundle` erases `TApi` | See §4e above — pragmatic leak. |

Every one of these is explicable in tagless-final terms. That is the main payoff of the mapping: the algebra is not ad-hoc, the literature addresses each thing, and we have names.

## 6. Summary

Two observations:

1. **Franklin is already tagless final in its bones.** The parametric-extension pattern, the "join APIs and pass once" property, and the pluggable compiler-per-system shape are all classical tagless-final moves. The algebra we have is not invented. The literature directly applies.

2. **Franklin muddles two roles of the interpreter.** The compiler is both "the dictionary that dispatches method calls" and "the builder that accumulates registrations." The `api` field types only the first role. The second role is untyped — and it's where the phase leaks (env, store, deps) live, because mixing dispatch with accumulation lets some dispatches return live resources while others just write to hidden state. Different methods inhabit different phases and the types don't say so.

Staying inside the tagless-final style is good — it's powerful and well-understood. Making the second role explicit is what memos 03–05 are for. Memo 03 frames the fix through **staging** (phases become first-class in types). Memo 04 frames the composition shapes through **categorical structure** (combine vs transformer vs hook). Memo 05 tries to unify.
