This is a partial transcript of a conversation between a user and an AI assistant. Intermediate AI messages have been elided.

## User

Okay. I want you to conduct a researching task over the algebra of the extension system. I'm not entirely certain if what we are doing is defining categories or is... if it's related to type theory, category theory, or what. But... I basically wanna nail down a little bit the rules of composition, because I think they're a little underdeveloped and it's making it a little hard to reason about, um, especially when it comes to, um, how to think of, say, the- Mm-hmm ... sessions API, which depends... is not like a pure, uh, like a simple, uh- Mm-hmm ... mono- monoidal, uh, composition, but it's like, it, it's something a little bit more, and I didn't quite know how to describe that. And I also wanna move some other things, um, into such a, such an idea. So basically, uh, here's just a bit of a, a brain dump. The first thing is, at the moment... Uh, there are basically two concepts in our, in the system. There is the idea of the API, which defines, which lives in kind of the land of compile time. Then you have the idea of the runtime, which obviously lives in the rand- land of runtime. At the moment, the ru- the, the systems don't quite, um... isolate that enough. For example, the environment API... ... re- basically is returning a runtime object, but during compile time, which doesn't quite make sense. I think it... Part of the issue here is... I don't think the algebra yet quite makes sense. Uh, we've got kind of API state and runtime and compiler and runtime system. And... Their relationship is a little bit fuzzy. I can find it. The compiler... You know, kind of constr- What I think is maybe a little confusing is that really we have to be thinking about this all at the type level and make sure that there are straightforward composition between... Everything? No, no, no. And that's kind of possible at the moment with the compiler because to combine two compilers together, you join together their APIs, and you only pass that through the extension once. So actually, sorry, extension is also part of this algebra, and you only pass it through once as opposed to twice, and it has to kind of be that way. So yeah, the question is just kind of get up to speed of that, try to isolate the problem I'm identifying, and then I'm gonna ask you to do some research into a particular... Mm-hmm ... type theory afterwards. Um, yeah.

## Assistant

Branch renamed to `A-F-V/ext-algebra-research`. I've mapped the extension algebra end-to-end. Here's what I found, framed around your brain dump so we can decide what type theory to research next.

## Current algebra (what exists)

**Types involved:** `Extension<TApi>`, `BaseAPI`, `Compiler<TApi, TResult>`, `BaseRuntime<S>`, `BaseState`, `RuntimeSystem<S, API, RT>`, plus the concrete systems (`Core`, `Store`, `Environment`, `Dependency`, `Sessions`) and the bundle type.

**Two composition operators today:**
1. **`combine`** on compilers / runtimes / systems — symmetric, object-spread based, guarded by `AssertNoOverlap`. Type-level signature `A1 & A2, R1 & R2`. No identity. (`packages/extensions/src/algebra/system/combine.ts:13`)
2. **`reduceExtensions`** on extensions — monoidal, identity = no-op, requires homogeneous `TApi`. (`packages/extensions/src/algebra/types/extension.ts:10`)

**The "pass extension once" property** lives at `packages/extensions/src/algebra/compiler/compile.ts:22`: `compileAll` runs each extension against the merged `api = {...c1.api, ...c2.api}` exactly once. Routing to sub-compilers works only because spread preserves method identity — there's no dispatch mechanism.

## The tensions you named, isolated

1. **Phase leak in `EnvironmentAPI`.** `createCompiler` calls `await factory(state.env)` *before* `build()`, then `api.getEnvironment()` hands back that live object at registration time (`systems/environment/system.ts:26-43`). The README even instructs extensions to capture it into a local binding. Compare with `CoreAPI.on` / `StoreAPI.registerStore` which are pure writes. `DependencySystem` has the same shape but its value is an out-of-session singleton. Three different ownership semantics under one interface.

2. **Sessions is not a `combine`.** `SessionSystem<RTS>` is a *transformer* — wraps an existing system, preserves its state shape, augments API + runtime. It doesn't appear in the `CombineSystems` family and has no algebraic name in the code. The README's combine-algebra section is `[TODO]`.

3. **Same word, different types.** `BaseRuntime.fork()` returns `Promise<S>` (data). `SessionRuntime.session.fork()` returns `Promise<Session<SessionRuntime<RTS>>>` (live). And `SessionAPI` vs `SessionRuntime.session` even use different method names for the same closures (`createChild` vs `child`).

4. **`api` is overloaded.** The compiler's `api` field is a mutable value; the `FooAPI` types are shape descriptions. Docs conflate them.

5. **A hidden third phase.** `withSetup` (`algebra/system/setup.ts`) runs code between `build()` and handing the runtime to the caller, with no type-level footprint — its signature `RuntimeSystem → RuntimeSystem` is invisible. Used for auth/credential wiring.

6. **Bundle erases the API parameter.** `ExtensionBundle.extension: Extension<any>`.

## Where this points

The core asymmetry is: **some things in `api` are pure registrations into a description, others are handles to resources that already exist.** Right now both wear the same clothing (a method on the `Compiler.api` object), and the type system doesn't distinguish them. That's why env "returns a runtime thing at compile time" feels wrong — the type says *registration*, the behaviour is *resource acquisition*.

A clean split would need the algebra to track *phase* (description vs realization), *effect kind* (pure registration vs resource-holding), and maybe *composition kind* (monoidal sum vs transformer/wrapper vs resource-scoped). These live in different formal traditions — e.g. two-level type theory, free/effect algebras, graded monads, presheaf-style compilers, or applicative-vs-arrow-vs-monad.

**Where would you like me to aim the type-theory research?** A few directions I could go:

- **Free monads / effect algebras** (Extension as a free functor, Compiler as interpreter) — best fit for the "pass once, join APIs" property.
- **Two-level / staged type theory** (explicit compile-phase vs runtime-phase) — best fit for the env phase leak.
- **Categorical composition with multiple arrow kinds** (monoidal + transformer + resource-scoped) — best fit for `SessionSystem` not being a `combine`.
- **Linear / graded types for resource ownership** — best fit for distinguishing pure registrations from resource acquisitions on the same API object.

Say which (or which combination), and any existing reading you want me to ground in.

## User

Okay. I'm... I kinda wanna do some deep study into, I guess, the fundamental... nature of what I'm doing. I did a course in category theory a while ago and type theory, so I'm, I'm not going from square zero. But I think... Like, yeah. Wow. What you've identified... With respect to... Issue of phases. And the different ty-types of... The different phases... And the different composition, uh, approaches, I think is something we kind of want to look at explicitly for all our systems so far. I mean, there's nothing wrong with session system not being a combine, but it should just kind of make sense. Um... Apparently, this is sort of a tagless style. You know, solving the expression problem. What I kind of want is to better understand actually what are these different comp- these different components fundamentally. So, ugh, maybe- Mm-hmm ... you start off by just, like, reading the, the kind of the original tag lists. I forgot what it was called. It was like... Tagless final system. How that relates to this, and then we kind of go into, like- Is a system like this actually kind of a c- I mean, in theory, it feels like it should be a common algebra. And we kind of wanna figure out, if it is a common algebra, how to make sure that it's... we reuse that exact same pattern.

So tell me what you are going to do next

## Assistant

Here's what I'm proposing. Check it before I execute — I can adjust scope.

## Research plan

**Phase 1 — Ground in tagless final.** Read the primary sources and write up what the pattern actually is, in its own terms, before mapping anything onto Franklin.
- Carette, Kiselyov, Shan — *"Finally Tagless, Partially Evaluated"* (JFP 2009, canonical paper)
- Kiselyov's 2012 lecture notes *"Typed Tagless Final Interpreters"* (okmij.org)
- Wadler 1998 *"The Expression Problem"* (the problem tagless final solves)
- Complement with initial encodings (free monads / F-algebras) so we can see the *contrast* — tagless final as the final-encoding dual.

**Phase 2 — Map Franklin onto it precisely.** For each type in our algebra (`Extension`, `TApi`, `Compiler`, `RuntimeSystem`, `BaseRuntime`, `SessionSystem`), state its tagless-final counterpart (term / typeclass / interpreter / etc.) and flag where the mapping breaks down. Key questions:
- Is `Extension<TApi>` truly a tagless term, or is it a *procedure* that produces effects on the interpreter?
- Is the compiler's mutable `api` field a faithful interpreter, or a fusion of interpreter + accumulator?
- Why does "pass extension once, join APIs" fall out naturally from parametricity here?

**Phase 3 — Isolate the phase structure.** The compile/runtime split is a *staging* concern. Read:
- Taha & Sheard 1997 *"Multi-stage programming with explicit annotations"*
- The relevant chapters of *Two-Level Type Theory* (Annenkov et al.) for a modern type-theoretic phrasing
- Cross-reference with how tagless final handles staged interpreters (partial evaluation section of Carette-Kiselyov-Shan is directly about this)

Then diagnose specifically why `EnvironmentAPI` vs `CoreAPI` feel different — my hypothesis going in: env's interpreter *evaluates* at stage 0 while core's *describes* for stage 1.

**Phase 4 — The common algebra question.** Look at `combine`, `SessionSystem`, `withSetup`, `DependencySystem` through one lens. Candidate framings to test:
- Are these all endofunctors on a category of systems, with `combine` = tensor product, `SessionSystem` = a specific functor, `withSetup` = Kleisli-post-composition?
- Or closer to a monad-transformer / effect-handler picture where everything lifts an underlying system?
- Goal: one uniform pattern that makes "why SessionSystem isn't a combine" a *statement* in the algebra, not an exception.

**Phase 5 — Recommendation memo.** Short document: what Franklin is formally, what the uniform composition pattern should look like, and concrete implications for the env leak + sessions placement. Not a refactor plan — a conceptual foundation the refactor can stand on.

## Deliverables

- `.context/algebra/01-tagless-final-foundations.md` — phase 1 writeup
- `.context/algebra/02-franklin-mapping.md` — phase 2
- `.context/algebra/03-phase-structure.md` — phase 3
- `.context/algebra/04-common-algebra.md` — phase 4
- `.context/algebra/05-recommendation.md` — phase 5

Each is a standalone memo we can discuss.

## Questions before I start

1. Depth: proper academic-level engagement (read the papers, cite them, reproduce key definitions) or lighter "translate for a working engineer"? I'd default to the former given your category theory background.
2. Scope: stay strictly to tagless final + staging + composition algebra, or also survey adjacent frameworks (algebraic effects, lenses-over-systems, comonadic composition) when they're clearly relevant?
3. Do you want me to execute Phase 1 end-to-end before checking in, or write up each phase and pause for discussion?

## User

1) medium. We are not writing a report but its for me
2) You can go adjacent if it simplifies things
3) Sure go ahead

## Assistant

Done. Five memos written to `.context/algebra/`:

- **01-tagless-final-foundations.md** — the pattern in its own terms (Symantics, parametricity, product-of-instances, staging, initial-vs-final trade-offs, glossary)
- **02-franklin-mapping.md** — Franklin ↔ tagless-final mapping table; why "pass extension once" is parametricity; the compiler's dual interpreter/accumulator nature; four places the map frays (void-returning extensions, non-uniform return types, state-parameterised interpreter family, SessionSystem's self-reference)
- **03-phase-structure.md** — staging + 2LTT foundations; every api method classified into four phase buckets (A: pure registration, B: description handle *missing*, C: stage-1 resource returned at stage-0 [the leak], D: stage-0 constant); file-by-file audit
- **04-common-algebra.md** — monoidal categories, transformers, handlers, comonads, graded monads; 7 diagnostic questions; applied to `combine` (partial symmetric monoidal), `SessionSystem` (transformer/endofunctor — its self-reference is *definitionally* why it can't be a combine, same reason `StateT` isn't `State × _`), `withSetup` (monoid action)
- **05-recommendation.md** — synthesis: three unencoded axes (phase, composition shape, effect kind); two candidate target architectures (A: pure tagless-final + `Deferred<T>` modality, B: algebraic-effects/free-monad); my read is Option A first, with B as direction of travel; concrete implications per smell; six open questions; smallest next step: prototype `Deferred<T>` on EnvironmentAPI

Key insight across the memos: Franklin is tagless-final in its bones (good — literature applies directly), but encodes only the signature axis in types. Phase, composition shape, and effect kind are cultural convention. That's the one-sentence diagnosis.