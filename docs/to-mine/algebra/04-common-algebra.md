# Memo 04: Common Algebra — Composition Shapes and Their Classifications

Study notes on categorical structures for composition, then a field-guide-style classification of Franklin's three composition operators and its systems.

Sources: Liang, Hudak, Jones *"Monad Transformers and Modular Interpreters"* (POPL 1995). Plotkin & Pretnar *"Handling Algebraic Effects"* (LMCS 2013). Bauer & Pretnar (Eff). Kiselyov *"Extensible Effects / Freer Monads"*. Atkey *"Parameterised Notions of Computation"* (2006). Katsumata *"Parametric Effect Monads"* (2014). Orchard, Petricek, Mycroft *"The Semantic Marriage of Monads and Effects"* (2014). Milewski *"Category Theory for Programmers"*.

---

## 1. The central question

When we see `op(a, b)` — or `op(a)` producing a result "like `a`" — there are several distinct algebraic structures it could be. Naming them matters because:
- the *laws* differ (symmetric? associative? identity?),
- the *type signatures* differ (`A × B → A⊗B` vs `A → TA` vs `A → A`),
- the *semantics* differ (order-sensitive or not?),
- and conflating them costs us ability to reason.

The shapes relevant to Franklin:

- **Combine / tensor** — symmetric monoidal product: `A ⊗ B`.
- **Transform / wrap** — functor / endofunctor: `T: C → C`, producing `T A` from `A`.
- **Decorate** — monoid action: `h · a` where `h` is a hook.

And further out:
- **Handler / coproduct of signatures** — algebraic-effects style.
- **Comonadic context propagation** — cofree-like self-reference.
- **Indexed / graded monads** — phase/resource-annotated composition.

## 2. Monoidal categories — the clean case

A **monoidal category** is a category `C` with:
- bifunctor `⊗ : C × C → C` (tensor),
- unit object `I`,
- natural isomorphisms: associator `(A⊗B)⊗C ≅ A⊗(B⊗C)`, left/right unitors `I⊗A ≅ A`, `A⊗I ≅ A`,
- coherence: pentagon + triangle axioms. Mac Lane's coherence theorem says every diagram of associators/unitors commutes.

**Symmetric monoidal** adds a coherent swap `A⊗B ≅ B⊗A`.

**Cartesian monoidal** is the special case where `⊗ = ×` (categorical product), `I = 1` (terminal). Adds canonical `delete : A → 1` and `duplicate : A → A×A`. Resource/linear categories deliberately drop duplication.

Intuition: monoidal combination puts two things side-by-side with no interaction. `⊗` is "and also." If your operator:
- is associative up to iso,
- has a neutral identity,
- (symmetric case) commutes,

it's monoidal. Right abstraction for systems with independent state, independent capabilities, no shared channels.

## 3. Intersection types as (nearly) monoidal

TypeScript `A & B` behaves like a symmetric monoidal tensor when `A` and `B` have disjoint keys. Associative, commutative, `{} & A ≅ A`. On the subtyping lattice, `&` is meet, and meets in a thin category *are* cartesian products.

Breaks: when keys collide, `A & B` intersects field types (`{foo: number} & {foo: string}` → `foo: never`), which is the logical meet but rarely what you want operationally. At runtime, object-spread `{ ...a, ...b }` is **not** intersection — it's a biased merge, later-wins. The algebraic law you get from a spread-based `combine` is:

> `combine` is monoidal **modulo a disjointness precondition**.

A `combine` that throws on namespace collision is precisely this: a partial operator refusing to run outside the domain where it would be cleanly monoidal. Franklin's `combine` is the tensor product on a full subcategory of systems whose surfaces are pairwise disjoint.

## 4. Transformers are NOT symmetric monoidal

A **monad transformer** is an endofunctor on monads: `T : Monad → Monad`. `StateT (ReaderT m)` and `ReaderT (StateT m)` have *different* types and usually *different semantics*.

Classic example — state over errors:
- `StateT s (Either e) a ≅ s → Either e (a, s)` — on failure, state is *lost*.
- `ExceptT e (State s) a ≅ s → (Either e a, s)` — on failure, state is *preserved*.

These aren't isomorphic. **Transformer composition is ordered, non-symmetric.** It's a (strict) monoid under composition with `IdentityT` as unit, but non-commutative. Order encodes semantics.

Lesson: when `F(G(x))` depends on order for *meaning*, not just for types — you're in transformer-land, not monoidal-land. Don't name it "combine."

### Classical MTL, one-liner each

- `IdentityT` — identity transformer.
- `ReaderT r` — read-only environment.
- `WriterT w` — append-only log in a monoid.
- `StateT s` — read/write cell.
- `ExceptT e` — short-circuiting failure.
- `MaybeT` — `ExceptT` with trivial error.
- `ContT r` — first-class continuations.
- `ListT` — non-determinism (subtle).

You need `lift : m a → T m a` to move base computations up, and typeclasses (`MonadState`, `MonadReader`, ...) so callers can ignore stack depth.

### The n² problem

For `N` effects you need `O(N²)` instances to let any effect tunnel through any transformer. Each new transformer must explain how every pre-existing effect lifts through it. Plus stack order is a global commitment the effect author can't override. These pressures motivated algebraic effects.

## 5. Algebraic effects and handlers

Plotkin-Power + Pretnar. Picture:

- **Effect signature** — a functor `Σ : Set → Set` built from operations with arities. `State s` has `get : 1 → s` and `put : s → 1`.
- **Computation** with signature `Σ` — a tree: leaves are values, internal nodes are operation calls with continuations. The **free monad** `Free Σ`.
- **Equational theory** on `Σ` may quotient this free algebra (e.g. `get; get` equals `get` bound twice to the same value).
- **Handler** — a structure-preserving map (`Σ`-algebra homomorphism) from `Free Σ` into some target carrier. Can resume the continuation zero, one, or many times — how exceptions, non-determinism, coroutines all fall out of one mechanism.

**Key structural fact for Franklin's question:**

> At the **signature** level, effects compose by **coproduct (disjoint sum)** `Σ₁ + Σ₂`. *Symmetric, associative.* At the **handler** level, handlers apply *sequentially* — `handle h₁ (handle h₂ c)` ≠ `handle h₂ (handle h₁ c)` in general.

A duality: **what combines symmetrically can differ from what runs in order**. Signatures form symmetric (cocartesian) structure under `+`; handlers form sequential structure. The same computation gets many orderings of handlers; each ordering corresponds to a monad-transformer stack; but the program text doesn't commit.

This resolves the n² problem: new effects enlarge the coproduct; `Free` reuses its machinery; no pairwise lifting.

### Transformers vs handlers, summary

| | Transformers | Handlers |
|-|-|-|
| Composing effects | Functor composition (ordered) | Coproduct of signatures (symmetric) |
| Adding an effect | New transformer + `O(N)` lifts | Extend signature; no boilerplate |
| Runtime rep | Concrete monad stack | Free monad / delimited continuations |
| Order | Baked into type | Chosen per-handler |

For a plugin system where extensions contribute effects, **handlers are conceptually the better fit**: extensions add *operations* to a shared signature; a runtime handles them.

## 6. Comonads and context propagation

A **comonad** is dual to a monad. Functor `W` with `extract : W a → a`, `duplicate : W a → W (W a)`. coKleisli arrow `W a → b` — a context-dependent consumer.

Examples:
- `Env e` — value paired with environment.
- `Store s` — peek/seek cursor; focus + lookup.
- `Stream` — infinite list; temporal context.
- `Cofree f` — cofree comonad; infinite tree with value at every node. Dual to `Free f`.

For session systems where forking a child inherits parent context: **comonadic flavour**. `duplicate` turns a session into a session-of-sessions; `extract` reads the current one. Cofree comonads naturally carry "tree of derived contexts."

## 7. Indexed and graded monads

**Indexed monad** (Atkey) — `M i j a` with `return : a → M i i a`, `bind : M i j a → (a → M j k b) → M i k b`. Indices thread linearly. Models parameterised monads tracking phase transitions (file handle open/closed).

**Graded monad** (Katsumata; Orchard-Petricek-Mycroft) — `M e a` where `e` is a *monoid* or *semiring* grade. `return : a → M 1 a`, `bind : M e a → (a → M f b) → M (e · f) b`. Composition multiplies grades. If `E` is a semiring, you can also track alternatives via `+`.

Orchard-Petricek-Mycroft show this recovers effect systems and comonadic coeffect systems in one framework.

Directly relevant: "what phase / what permissions / what capabilities does this operation require" is exactly what a grade tracks. If `SessionSystem(sys)` is a system only usable once a session is established, that's a **grade-change**, not additive state.

## 8. Diagnostic questions

Given `op(a, b)` or `op(a)`, ask:

1. **Symmetric?** `op(a, b) ≅ op(b, a)`? Yes → candidate monoidal. No → ordered (transformer, handler, function composition).
2. **Associative?** `op(op(a,b), c) ≅ op(a, op(b,c))`? Monoidal requires yes.
3. **Identity?** Some `I` with `op(a, I) ≅ a`? Empty system, `IdentityT`, no-op handler, `id` decorator. Strong monoid signal.
4. **What does the result type depend on?**
   - Both inputs, product/intersection → monoidal combine.
   - A functor applied to one, parameterised by the other → transformer / wrapper.
   - One input's type (identity-on-type) → decoration / action.
5. **Runtime: transparent or layered?** Transformers add layers; combines usually don't; handlers collapse layers during interpretation.
6. **Swap order?** Always equivalent → symmetric monoidal. Signature-symmetric but handler-ordered → algebraic effects. Never → ordered.
7. **Side condition?** Disjointness, freshness, linearity → partial operator on a subcategory. Fine; name the precondition.

---

## 9. Applied to Franklin

### Combine: `combine(sysA, sysB)`

`algebra/system/combine.ts:13` and `algebra/compiler/combine.ts:11`.

- Symmetric? **Yes**, modulo disjoint keys (which TypeScript enforces via `AssertNoOverlap`).
- Associative? **Yes**, up to object-spread semantics.
- Identity? **Yes** — an empty system (`{ emptyState: () => ({}), createCompiler: () => ... }`), though not explicitly named in code.
- Result type: product/intersection of both (`A1 & A2`, `R1 & R2`).
- Side condition: disjointness of state keys, API keys, runtime keys.

Classification: **partial symmetric monoidal product on the subcategory of systems with disjoint surfaces**. Name it tensor or parallel-combination. This is the clean case.

### SessionSystem: `SessionSystem<RTS>`

`systems/sessions/system.ts:14`.

- Symmetric? **No** — it's unary.
- Result type: a *functor applied to one input* (`System → System`), not a product.
- Preserves inner system (state shape unchanged, api & runtime augmented).
- Does it have a `lift`? Effectively yes — you can still access all inner-system capabilities inside a session-wrapped system.
- Swap order matters: `SessionSystem(SessionSystem(sys))` is nonsensical; `SessionSystem(combine(sys1, sys2))` ≠ `combine(SessionSystem(sys1), SessionSystem(sys2))`.

Classification: **an endofunctor `T : System → System` on the category of systems**. Specifically:
- It **preserves** state (`InferState<T(sys)> = InferState<sys>`).
- It **adds** to API (`InferAPI<T(sys)> = InferAPI<sys> & SessionAPI<sys>`).
- It **adds** to Runtime (`InferRuntime<T(sys)> = InferRuntime<sys> & SessionRuntime<sys>`).
- It **self-references**: the added operations return `T(sys)` itself (session.child produces a new `Session<SessionRuntime<RTS>>`).

The self-reference is the characteristic signature of a **monad transformer**: `StateT s m` has `get : StateT s m s` where `s` is the transformer's own state, and `lift : m a → StateT s m a` recovers the base. Equivalently of a **recursive algebraic effect**: the session signature includes operations that produce further session-equipped computations. Either framing is valid; both capture the self-reference.

### withSetup

`algebra/system/setup.ts`.

- Signature: `(sys: System) → (f: (rt: RT) => void) → System` (same type out as in).
- Associative in `f`? If we compose hooks: `withSetup(withSetup(sys, f1), f2) = withSetup(sys, f1 ∘ f2)` (or reverse order). Hooks form a monoid under function composition.
- Identity? `withSetup(sys, () => {})` = `sys` up to observable behaviour.
- Result type: identical to input type.

Classification: **a monoid action on systems**. The acting monoid is hooks under composition; the action is post-build side effect. Equivalently: a Kleisli-style post-composition in a build-time effect monad — `sys ↦ sys >>= (s ⇒ f(s) *> pure s)`.

This is **decoration**, not composition of systems. Different structure entirely from combine or SessionSystem.

### Summary table

| Operator | Algebraic pattern | Key law |
|---|---|---|
| `combine` | Partial symmetric monoidal product | `A ⊗ B ≅ B ⊗ A` when disjoint |
| `SessionSystem` | Endofunctor / transformer on systems | `T : System → System`, self-referencing |
| `withSetup` | Monoid action via Kleisli post-composition | `(h₁ ∘ h₂) · sys = h₁ · (h₂ · sys)` |

These are three distinct algebraic patterns. That's not a problem — they're doing genuinely different jobs. But they should be **named** so we can think about them separately.

## 10. Where each system sits

Beyond the three operators, the concrete systems themselves have algebraic character:

- **CoreSystem** — monoidal atomic unit. Bucket A of memo 03's API classification (all pure registrations). The canonical "well-behaved system."
- **StoreSystem** — monoidal atomic unit with bucket-C leak: `api.registerStore` returns a live handle. If we fixed the phase leak (see memo 03 §8 directions), it'd be a clean monoidal piece.
- **EnvironmentSystem** — combinable (disjoint namespace `env`), but with the bucket-C phase leak. Same pattern as StoreSystem.
- **DependencySystem** — combinable, bucket-D (stage-0 constant). Arguably the cleanest of the non-core systems because its returned value doesn't change over the session lifetime.
- **SessionSystem** — **not** a combine; a transformer/functor. See §9.

### Could SessionSystem be a combine instead?

Tempting thought experiment: could we make SessionSystem a regular combine with a `SessionCapability` system? The answer is **no**, and the reason is illuminating:

A combined system requires each component to have its own compiler and runtime that can be built independently. SessionCapability would need to implement `session.child()` — which must create *a whole new system-equipped session*, not just its own little piece. That requires access to the factory function for the composed system, i.e., the system itself. Self-reference. A combine, by design, doesn't give one component access to the composed whole.

This is **exactly** why monad transformers exist and why `StateT` isn't `State × _`. Operations in `StateT`'s signature need access to the outer monad. Self-reference at the effect level is the definitional signature of a transformer.

So: SessionSystem has to be a transformer. The category-theoretic story isn't a problem to fix; it's a *statement* — "sessions is a transformer because its operations are recursive over the whole system." Memo 05 takes up what this means in practice.

## 11. Potential unification

Could all three operators be unified under one framework? Candidate lenses:

### A. Everything as endofunctors on `System`

`combine(sys, _)` is the endofunctor "add sys's surface to whatever I'm given." Partial, requires disjointness. `SessionSystem` is an endofunctor. `withSetup(_, f)` is an endofunctor (identity on type, but a real morphism in the subcategory where sameness-of-type is a morphism).

This lens unifies but loses information — the laws differ.

### B. Combine as cocartesian (coproduct), Session as transformer, withSetup as decoration

Keep them distinct. Make the distinctness structural:

- `combine : System × System → System` (symmetric monoidal).
- Transformers: `Transformer = System → System` with laws / `lift`.
- Decorations: `Decoration = System → System` where the type is preserved.

Each gets its own name. `combine` is the tensor. `SessionSystem` is a specific `Transformer`. `withSetup` is a specific `Decoration`.

### C. Algebraic effects across the board

Reframe *every* system as declaring effect operations (signatures). `combine` is signature coproduct. SessionSystem adds session operations to the signature. withSetup adds an initialisation operation. The runtime is a handler for all of them.

This unifies beautifully at a cost: the intellectual reframe is non-trivial and some operational clarity (which system owns which state) is obscured. Also: the "compiler mutably accumulates registrations" idea from memo 02 would need to be replaced by "extensions produce a free monad value that the compiler interprets." Conceptually clean; implementation cost is real.

Memo 05 takes this up.

## 12. Glossary

- **Monoidal category** — category with tensor `⊗`, unit `I`, coherent associator and unitors.
- **Tensor product** — bifunctor `⊗`; "and also" at object level.
- **Cartesian** — monoidal where `⊗ = ×`.
- **Symmetric monoidal** — plus coherent swap.
- **Monad transformer** — endofunctor on monads, `T : Monad → Monad`.
- **Lifting** — mapping from base monad into transformed monad (`lift : m a → T m a`).
- **Algebraic effect** — operation from a signature functor, interpreted by an algebra.
- **Handler** — homomorphism from `Free Σ` into a target carrier.
- **Comonad** — dual of monad; models context-dependent computation.
- **coKleisli arrow** — `W a → b`.
- **Indexed monad** — `M i j a` with pre/post indices.
- **Graded monad** — `M e a` with grade `e` in a monoid/semiring.
- **Coproduct** — disjoint union at signature level.
- **Free monad** — initial monad containing a signature functor.
- **Tagless final** — dual encoding; polymorphic program over interpreters.
- **Endofunctor** — functor `C → C`.
- **Monoid action** — `* : M × A → A` respecting monoid structure.
