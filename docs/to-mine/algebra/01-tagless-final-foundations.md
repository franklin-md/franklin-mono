# Memo 01: Tagless Final Foundations

Study notes on tagless final style and the expression problem. This is the pattern our extension system descends from, whether we named it or not. The goal of this memo is to have the vocabulary clean before mapping it onto Franklin (memo 02).

Sources: Carette, Kiselyov, Shan — *"Finally Tagless, Partially Evaluated"* (JFP 2009). Kiselyov's 2012 lecture notes *"Typed Tagless Final Interpreters"*. Wadler 1998 *"The Expression Problem"*.

---

## 1. The expression problem

From Wadler's 1998 email:

> "The goal is to define a datatype by cases, where one can add new cases to the datatype and new functions over the datatype, without recompiling existing code, and while retaining static type safety."

Two axes, captured by Wadler's table image: **cases are rows, operations are columns**. FP lets you add new columns trivially (new function = new pattern match) but adding a row breaks every existing match. OO lets you add new rows trivially (new subclass) but adding a column forces a change to the base class. We want both axes open.

Three simultaneous constraints:
1. Extend in both directions.
2. Without modifying or recompiling existing code.
3. Static type safety (no casts, no tags).

## 2. Initial encoding

The baseline. Define an ADT, interpret by fold.

```haskell
data Exp = Lit Int | Neg Exp | Add Exp Exp

eval :: Exp -> Int
eval (Lit n)     = n
eval (Neg e)     = - eval e
eval (Add e1 e2) = eval e1 + eval e2

view :: Exp -> String
view (Lit n)     = show n
view (Neg e)     = "(-" ++ view e ++ ")"
view (Add e1 e2) = "(" ++ view e1 ++ " + " ++ view e2 ++ ")"
```

Category-theoretically: `Exp` is the **initial algebra** of the signature functor `F X = Int + X + X×X`. Any interpreter is a catamorphism into some carrier. Initiality guarantees a unique algebra homomorphism for each carrier.

**Easy axis:** add new folds (`depth`, `size`, an optimiser) — columns.

**Hard axis:** add a new constructor `Mul Exp Exp` — every pattern match is now non-exhaustive. Must modify the datatype *and* every consumer.

Free monads / `Free f a = Pure a | Impure (f (Free f a))` are the same pattern scaled up — still initial, still pattern matching.

## 3. Final (tagless) encoding

The pivot: **don't name the term type. Abstract over it.**

```haskell
class Symantics repr where
  lit :: Int -> repr Int
  neg :: repr Int -> repr Int
  add :: repr Int -> repr Int -> repr Int
```

(*"Symantics"* is Kiselyov's pun: syntax + semantics.)

A term is **polymorphic**:

```haskell
tf1 :: Symantics repr => repr Int
tf1 = add (lit 8) (neg (add (lit 1) (lit 2)))
```

There is no `Exp` datatype. `tf1` is a value of type "for any `repr` implementing `Symantics`, I inhabit `repr Int`." Terms are built directly by invoking the interface methods.

**Interpreters are instances.** Evaluator with `repr = R`:

```haskell
newtype R a = R { unR :: a }
instance Symantics R where
  lit n = R n
  neg (R x) = R (- x)
  add (R x) (R y) = R (x + y)
-- unR tf1 == 5
```

Pretty-printer with `repr = S`:

```haskell
newtype S a = S { unS :: String }
instance Symantics S where
  lit n = S (show n)
  neg (S x) = S ("(-" ++ x ++ ")")
  add (S x) (S y) = S ("(" ++ x ++ " + " ++ y ++ ")")
-- unS tf1 == "(8 + (-(1 + 2)))"
```

Same `tf1`, two interpretations, zero recompilation.

**Adding a new case (the hard direction).** Don't touch `Symantics`. Introduce a new class:

```haskell
class MulSYM repr where
  mul :: repr Int -> repr Int -> repr Int

instance MulSYM R where mul (R x) (R y) = R (x * y)
instance MulSYM S where mul (S x) (S y) = S ("(" ++ x ++ " * " ++ y ++ ")")

tfm :: (Symantics repr, MulSYM repr) => repr Int
tfm = add (lit 7) (mul (lit 1) (lit 2))
```

Old terms (`tf1 :: Symantics repr => repr Int`) still typecheck, still run, untouched. Old interpreters still work on them. New interpreters only need to implement the classes they care about. Both axes open, no existing code modified, static safety preserved.

## 4. Why "tagless"?

In initial encoding, values carry runtime constructor tags; interpreters `case` on them. Two costs:
- Runtime dispatch and boxing per node.
- If you want typed object languages, tags force GADTs or runtime type errors on malformed terms.

Final encoding has no constructor, no tag. Dispatch is resolved at *compile time* via typeclass/dictionary resolution: `add` is a direct call to whichever dictionary `repr` resolved to. `R` is a newtype — erased. The payoff: the host's type system enforces well-typedness of the object language, with no GADTs and no possibility of constructing an ill-typed term.

Category-theoretically: final encoding is the **Church / Böhm-Berarducci encoding** of the initial algebra. A term is a polymorphic function `∀A. F-algebra(A) → A` — which is exactly a fold, universally quantified. *Every term is already its own fold.*

## 5. Composition of interpreters

You can run two interpreters on one term in one pass. The trick: products of instances.

```haskell
newtype Pair r1 r2 a = Pair (r1 a, r2 a)

instance (Symantics r1, Symantics r2) => Symantics (Pair r1 r2) where
  lit n = Pair (lit n) (lit n)
  neg (Pair a b) = Pair (neg a) (neg b)
  add (Pair a1 b1) (Pair a2 b2) = Pair (add a1 a2) (add b1 b2)
```

Formally: the product of two F-algebras in the category of F-algebras is itself an F-algebra; the universal arrow from the initial algebra factors through it. "Combining two interpreters" = the algebra product.

**Aside directly relevant to Franklin:** a `Symantics repr` instance is up to isomorphism a record

```haskell
data Sym repr = Sym
  { lit_ :: Int -> repr Int
  , neg_ :: repr Int -> repr Int
  , add_ :: repr Int -> repr Int -> repr Int
  }
```

A record of operations parameterised by a result type is an F-algebra in record form — which is exactly the "dependency-injected API" shape. A plugin receiving `(api: TApi) => void` that calls methods on `api` is structurally the same thing as a tagless-final term parameterised over `repr`. Different compilers supplying different `api` are different `Symantics` instances. This is the core of memo 02.

## 6. Parametricity is the mechanism

`tf1 :: forall repr. Symantics repr => repr Int` is stronger than it looks. By parametricity, `tf1` **cannot inspect `repr`**. It can only use the operations the class provides. Consequences:

- The term commits to *no* interpretation. Every interpreter is equally valid.
- Adding new classes strictly enlarges the set of terms expressible, cannot invalidate old ones.
- Extension composes: if a term uses `Symantics` and `MulSYM`, any `repr` providing both works. No interpreter ever needs to know the full set of classes in play.

This is why final encoding solves the expression problem: terms are *already* universally-quantified folds, and open-world extension is safe because existing terms quantify only over the capabilities they asked for.

## 7. Staging: the partially-evaluated variant

Section 5 of Carette-Kiselyov-Shan. Pick `repr = Code` (e.g. MetaOCaml `'a code`, Template Haskell `Q (TExp a)`). The interpreter now *generates code* rather than computing values.

```ocaml
module CodeSym : Symantics with type 'a repr = 'a code = struct
  type 'a repr = 'a code
  let lit n   = .< n >.
  let neg x   = .< - .~x >.
  let add x y = .< .~x + .~y >.
end
```

Running `tf1` against `CodeSym` yields code `.< 8 + -(1 + 2) >.`, compilable into a function with interpretation overhead erased.

The deeper move is *two-level*: a partial evaluator has `repr a = Static a | Dynamic (Code a)`. Constants propagate at generation time; unknowns residualise into code. You get constant folding, algebraic simplification, dead-code elimination for free, without touching the term.

**This is the central fact to carry into memo 03:** the interpreter can be a compiler. The choice of `repr` is the phase split. One interpreter runs the extension now; another interpreter, fed the same extension, emits a compiled / serialised / deferred representation. The extension is written once at one level of abstraction; the phase split lives entirely in the choice of `repr`.

## 8. Initial vs final: when to pick which

Initial when:
- You need to inspect, transform, or optimise the term as a data structure (AST rewrites, serialisation, sending over the wire).
- Multiple passes need to see the *same* structure.
- The term should be a first-class value you can pattern-match and quote generically.

Final when:
- Extensibility in both Wadler axes matters.
- Performance matters and you can afford to erase interpretive overhead via staging.
- Operations are a *capability menu* extensions opt into — "do I need `MulSYM`?" is load-bearing.
- Type safety of the object language should fall out of the host type system without GADTs.

What you give up going final:
- Term introspection is awkward (you can encode it by picking `repr = Exp`, but it's no longer free).
- Multiple non-compositional analyses (a global rewrite pass that wants raw structure) push you back toward building an AST.

Kiselyov's *"Relating Final and Initial Typed Tagless Representations"* gives a bijection. Instantiating `repr = Exp` converts final to initial; writing an interpreter that mirrors constructors converts the other way. They're the same thing, viewed from two sides — initial as least fixpoint, final as Church encoding.

## 9. Adjacent work worth knowing

- **Free monads** (`Free f a`) — initial encoding for effectful computations. Hit the expression problem when adding new effects. Swierstra's *"Data types à la carte"* patches this with coproducts of functors plus a subtyping typeclass `f :<: g` — essentially reinventing tagless-final inside the initial encoding.
- **Freer monads** (Kiselyov & Ishii) — drop the `Functor` requirement, store continuations directly. Still initial.
- **Algebraic effects and handlers** (Plotkin-Power, Pretnar, Eff, Koka) — effects declared as operations with a signature; handlers are interpreters. Structurally tagless-final, with a principled account of continuations, resumption, and delimited control. If tagless-final is "Church-encoded ADT," algebraic effects are "Church-encoded free monad with scoped handlers."
- **Typeclass polymorphism = final encoding.** Any `class C a where op :: ... a ...` with multiple instances is a final encoding. Most of Haskell's numeric hierarchy is tagless-final in disguise. Scala implicits, Rust traits, OCaml modules, TS structural interfaces — same pattern, different ergonomics.
- **Object algebras** (Oliveira & Cook 2012) — tagless-final translated into Java/Scala using generics. Good reading for the OO angle.

## 10. Glossary

- **Symantics** — a typeclass/record whose methods are the syntax of an object language and whose instances are its semantics.
- **Observation** — a function extracting an observable value from an interpreter run (`eval :: R a -> a`). Distinct from the interpreter because the interpreter's carrier may not itself be the answer you want.
- **Object language** — the language being embedded.
- **Metalanguage** — the host language doing the embedding.
- **Initial encoding** — represent terms as values of an ADT; interpret by fold. Algebraically `μF`.
- **Final encoding** — represent terms as polymorphic functions over a signature class; interpret by choosing an instance. Algebraically `∀A. F-algebra(A) → A`.
- **Tagless** — no runtime constructor tag; dispatch via compile-time typeclass resolution. No runtime type errors from malformed terms.
- **Staging** — picking an interpreter whose carrier is *code* rather than a value, so running produces a residual program.
- **F-algebra** — a pair `(A, α : F A → A)` for a signature functor `F`. An interpreter in the initial view.
- **Catamorphism / fold** — the unique homomorphism from `μF` to any F-algebra. In tagless-final every term is already a fold.
- **Church / Böhm-Berarducci encoding** — encoding an inductive type as its own fold: `Nat ≅ ∀A. (A → A) → A → A`. Tagless-final = Church applied to a multi-sorted signature.

---

## 11. What to carry into Franklin

Three facts from this memo that drive the mapping in memo 02:

1. **An `(api: TApi) => void` extension is a Symantics term** — parametric in `TApi`, committing to no interpretation. This is the core isomorphism.
2. **The combined-compiler / "pass extension once" property is parametricity**, not a bespoke composition trick. It's the product-of-instances move, specialised to disjoint signatures so dispatch is trivial.
3. **Staging is the same mechanism as choosing a different interpreter.** Whatever phase-separation problem we diagnose, the tagless-final lens says the answer is always "different `repr`, same term" — which means the algebra of `TApi` needs to distinguish description-returning methods from value-returning ones, because those correspond to different `repr` families.
