# Memo 05: Synthesis and Recommendation

What the prior four memos converge on. This is the conceptual foundation a refactor could stand on, not a refactor plan. Open questions called out at the end.

---

## 1. The one-sentence diagnosis

**Franklin is tagless-final with staging, but it encodes exactly one axis of its algebra in types (the surface signature via intersections) and leaves three axes as cultural convention: phase (when each method runs), composition shape (monoidal vs transformer vs decoration), and effect kind (registration vs resource acquisition).**

Every concrete smell in the exploration memo — env leak, `SessionSystem` not being a combine, `withSetup`'s invisibility, the `api`/`TApi` conflation — is a symptom of one of those three unencoded axes.

## 2. The three axes, named

### Axis 1: phase (description vs realisation)

From memo 03. Every method on a `Compiler.api` inhabits one of four buckets:

- **A** — stage-0 pure registration (returns `void`).
- **B** — stage-0 description handle (returns a reference meant to be consumed stage-1). *This is the category that doesn't exist yet in Franklin.*
- **C** — stage-0 call returning a stage-1 live resource (the phase leak).
- **D** — stage-0 call returning a stage-0 constant (the captured singleton).

Classes A, B, D are phase-respecting. C is the leak. The fix is to type-annotate the phase — introduce a modality (`Deferred<T>`, `Handle<T>`, `⇑T`, choose a name) so types distinguish "a reference to an env that will be realised" from "the realised env itself."

### Axis 2: composition shape

From memo 04. Three distinct patterns, one syntactic surface:

- **`combine`** — partial symmetric monoidal product (tensor).
- **`SessionSystem`** — transformer / endofunctor with self-reference.
- **`withSetup`** — decoration / monoid action, invisible in types.

All three currently return `RuntimeSystem<S, API, RT>`. Their *laws* differ but the type doesn't say so. The fix is to give each a distinct type-level marker (e.g. `System`, `Transformer`, `Hook`) or at minimum distinct names in the public API. Transformers and decorations are not sub-cases of combine; they're siblings.

### Axis 3: effect kind (pure registration vs resource requirement)

From memo 02 §4b. Api methods like `on`/`registerTool` are *writer effects* (append to accumulator). Methods like `getEnvironment`/`registerStore` are *reader effects on a pre-existing resource*. Methods like `createChild` are *effectful constructors*. All share one type shape (method on `Compiler.api`).

The algebraic-effects literature would write this as: each api method belongs to a specific signature `Σ`, and different signatures have different semantics (writer vs reader vs handler-resumable). Making this visible at the type level lets the compiler enforce that, e.g., a `getEnvironment` call cannot be made outside a stage-1 handler.

## 3. The single biggest conceptual move

If only one move is made, it should be:

> **Separate the compiler's two roles.** Today `Compiler<TApi, TResult>` is both "the Symantics dictionary for dispatch" and "the writer that accumulates registrations." Split these.

This single split cascades:

- The dispatch side is the clean tagless-final part. Extensions call methods on the dispatch record. Methods of class A/B (pure registrations, description-returning) live here. This is stage 0.
- The accumulator side becomes an explicit *state-threading effect* — extensions do not see it directly. The compiler is a function `(registrations, state) → Runtime`, not an object with hidden mutation.
- Class C methods (live resource access) are **removed from the dispatch surface**. They live only on the runtime (stage 1). At stage 0 you receive a description (`Deferred<Env>`) and you splice it inside stage-1 handlers.
- `withSetup` becomes a first-class `Hook<Runtime>` that composes under the hook monoid, not a side door.

This is essentially a move from **tagless-final-with-mutable-interpreter** to **either pure tagless-final or algebraic-effects-with-free-monad**. Both are textbook; our current hybrid is not.

## 4. Two candidate target architectures

Both are principled. Each has different trade-offs.

### Option A: pure tagless-final with explicit phase modality

Keep the tagless-final style. Introduce a phase modality. Two `repr` families:

- `repr₀` — stage-0 interpreter, builds a description value.
- `repr₁` — stage-1 interpreter, wraps a live resource.

The API is split:

```typescript
interface CoreAPI {
  on<E>(event: E, handler: Handler<E>): void;       // stage-0 registration
  registerTool(spec: Spec, execute: Execute): void; // stage-0 registration
}

interface EnvironmentAPI {
  requireEnvironment(): Deferred<Env>;              // stage-0 description
}

// In stage-1 handler context:
interface RuntimeContext {
  realise<T>(d: Deferred<T>): T;                    // cross-phase dereference
}
```

Extensions that need env get `Deferred<Env>` at registration, never a live env. Handlers registered via `on` take a `RuntimeContext` that can `realise` deferreds at stage 1.

**Pros:** minimal re-architecture, preserves the "extension calls api methods" authoring style, gets types on the phase boundary, composable with existing intersection-based combine.

**Cons:** two `repr` families means every extension author thinks in two phases; the modality machinery is new surface area; migration requires touching every extension that uses env / store / deps.

### Option B: algebraic effects with free monad of registrations

Reframe: extensions produce a *program value* (free monad of a registration signature) that the compiler interprets.

```typescript
type Registration =
  | { kind: "on"; event: string; handler: Handler }
  | { kind: "registerTool"; spec: Spec; execute: Execute }
  | { kind: "requireEnvironment"; then: (e: Deferred<Env>) => Registration }
  | ...

type Extension = Free<Registration, void>
```

The compiler is a **handler** that interprets `Registration` into runtime effects. Combining two systems is coproduct of signatures. SessionSystem adds operations to the signature, interpreted by a session handler. `withSetup` is just another signature element.

**Pros:** conceptually very clean. The "pass extension once" property becomes "the free monad is the universal carrier for signatures". Combine = coproduct, exactly as in the algebraic-effects literature. SessionSystem becomes a handler composition — the self-reference is natural (handlers resume continuations with the same signature). `withSetup` becomes a handler.

**Cons:** extensions are no longer plain `(api: TApi) => void` functions — they're free-monad values. Authoring model changes noticeably (in practice, monadic DSLs with `do` notation or equivalent). Bigger conceptual lift; migration is heavier; you lose some introspection simplicity if you're not careful.

### My read

**Option A is the minimal correct move.** It fixes the phase leak while preserving the authoring model and the "one extension, many interpreters" property that makes tagless final nice. The `Deferred<T>` modality is a concrete, implementable piece of machinery; the cost is one new type constructor and a discipline around how extensions access resources.

**Option B is the conceptually most satisfying move** and would make SessionSystem "fall out" of the algebra rather than be a special case. But it's a bigger lift and changes the extension authoring style.

A middle path: **do Option A now**, and keep Option B in mind for the direction of travel. Option A is a strict improvement — it doesn't lock out Option B later, because once phases are type-separated you can always migrate the signature into a free-monad formulation.

## 5. Concrete implications

For the specific items called out in the exploration memo:

### The environment phase leak
- Replace `getEnvironment(): ReconfigurableEnvironment` with `requireEnvironment(): Deferred<Env>` (Option A) or with a registration-level `require` operation (Option B).
- Extensions store the deferred, dereference inside stage-1 handlers.
- The `ReconfigurableEnvironment` is only constructed once, at system build time — but that's an internal detail, not visible in the extension API.

### StoreSystem's `registerStore` returning a `Store<T>` handle
- Same pattern. `registerStore(key, initial, sharing): StoreHandle<T>` where `StoreHandle` is a *description*, and `realise` at stage-1 gives you the live `Store<T>`.
- In practice the current usage pattern already respects this — extensions capture the handle and only call `.get()`/`.set()` inside handlers — so the migration mostly amounts to type-annotating what's already true.

### DependencySystem
- Stays. It's stage-0 constant (bucket D). Clean, but should be typed as a `Constant<T>` to distinguish from `Deferred<T>` resources, even if they have the same runtime shape.

### SessionSystem
- Stays a transformer. Its type should be visibly distinct from `combine`'s output — e.g. `Transformer<S, API, RT> : System → System` as a named shape.
- The recursive self-reference `session.child(): Promise<Session<SessionRuntime<RTS>>>` is *the characteristic signature of a transformer*. Not a bug, not worth eliminating. It should be documented as such.
- Potential simplification: if Option B is adopted, the session operations become effect-signature elements and self-reference becomes natural.

### withSetup
- Make it visible in the type. A `Hook<RT>` type that forms a monoid under composition. `withSetup(sys, f)` returns `SystemWithHooks<S, API, RT>` (or equivalent), distinct from a plain `System`.
- Hooks compose: `withSetup(withSetup(sys, f), g)` is well-defined and `≈ withSetup(sys, g ∘ f)` up to hook ordering.

### `api` / `TApi` conflation
- Documentation fix, essentially. The `api` field is the **interpreter record** (Symantics instance). The `TApi` type is the **signature** (Symantics class). Name them accordingly in doc.

### ExtensionBundle's `Extension<any>`
- Preserve the `TApi` parameter. `ExtensionBundle<TApi, TKeys, TTools>`. Pragmatic issue, unrelated to the big picture.

## 6. What this buys us

If Option A is done, we gain:

- **Types enforce phase.** The compiler tells you when you're reaching for a stage-1 resource at stage-0. No more README authoring rules.
- **SessionSystem's "not a combine" becomes a statement in the algebra**, not an exception — "it's a `Transformer`, here are the laws."
- **New systems have a decision tree.** When adding a system, you ask: (1) which phase do its methods inhabit? (2) is it combinable, a transformer, or a decoration? The answers dictate the shape.
- **The "pass extension once" property stays clean** — it's still parametricity over the merged signature.
- **Persistence becomes thinkable.** A pure-registration extension produces something serialisable (an accumulator of descriptions); a resource-acquisition call doesn't. Making these distinct in the type is a precondition for any kind of transportable/serialisable extension story.

If Option B is done (longer arc), we gain all of the above *plus*:

- **`combine` becomes coproduct of signatures** — the cleanest monoidal story.
- **SessionSystem becomes a handler** — the recursive self-reference is handled by the handler-resume mechanism, natural and principled.
- **Effect algebra is the unifying frame**: every piece of Franklin is either a signature or a handler, composition rules are those of algebraic effects, and the relationship to tagless final is the known duality (free monad ↔ Church encoding).

## 7. Open questions for us to decide

1. **Is Option A enough, or should we aim for Option B?** The former is a surgical fix; the latter is a cleaner foundation. Which matches our current risk appetite and roadmap?

2. **How important is persistence of extension state?** If extensions should be serialisable/transportable, that strengthens the case for Option B (program-as-data) over Option A (program-as-procedure-with-phase-modality).

3. **What is the authoring experience we want?** Option A keeps `(api: TApi) => void`. Option B needs monadic DSL ergonomics. The TS syntactic overhead of monadic DSLs is real and uncomfortable; we should have a concrete sketch of "what an extension looks like in Option B" before committing.

4. **Is there a fourth composition shape lurking?** We have combine, transformer, decoration. Comonadic context propagation (§6 of memo 04) showed up in the session-tree discussion. Is that a real fourth pattern that needs a name, or is it folded into "transformer"? Worth checking if a concrete system ever wants `duplicate : System → System<System>` semantics.

5. **Should `ExtensionBundle` be removed?** It's orthogonal to the big picture, but given the type erasure issue, if we're doing a refactor, it's worth asking whether bundles are the right abstraction or if what they do should just be a pattern.

6. **What's the migration story?** If we go Option A, every existing extension using env / store / deps needs to be updated. That's a finite, mechanical change — but it touches every extension. Do we do it big-bang or in phases?

## 8. If I had to pick one next action

**Implement `Deferred<T>` as a modality.** A concrete, small piece of type-level machinery. Apply it to `EnvironmentAPI` first as a pilot. If the ergonomics hold up, expand to Store and Dependency. If they don't, we learn something concrete about what's wrong with Option A before we've committed.

This is the smallest step that forces us to take the phase axis seriously. Everything else in this memo can be prioritised against the learning from that pilot.
