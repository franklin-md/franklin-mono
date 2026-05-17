# @franklin/extensions

Plugin system for Franklin's agent runtime. Extensions register tools, lifecycle handlers, and reactive stores that are compiled into client + server middleware.

## APIs

Extensions are authored against a tuple of `BuildableModule`s with
`defineExtension<Modules>(...)`. A module contributes any registration API it
owns plus any runtime capabilities its handlers can read from `ctx`.
Implemented so far:

- **CoreModule**: Contributes the core registration API, extending a minimal agent loop with tools and context management. Tool and handler closures receive the fully composed runtime.
- **StoreModule**: Contributes store registration plus runtime access to shared state between agent-agent and agent-app.
- **StoreStateModule**: Wraps `StoreModule` with the persisted `{ store: StoreMapping }` state shape used by state-module composition.
- **EnvironmentModule**: Contributes runtime environment capabilities; its registration API is empty.
- **Orchestrator**: Materializes root, child, fork, and restored runtimes from a reduced harness module while injecting `ctx.self` and `ctx.orchestrator`.
- **DependencyRuntime<Name,T>**: Simple way for an extension to depend on an app-provided global resource (authentication, secrets, app-level environment). The dependency lands on the runtime as a field keyed by `Name`, so handlers read it via `ctx.<name>`.

The resolved API surface can be named with `ExtensionAPI<Modules>`, and the
extension function type can be named with `ExtensionForModules<Modules>`:

```typescript
type MyModules = [CoreModule, StoreStateModule, EnvironmentModule];

const extension = defineExtension<MyModules>((api) => {
	api.registerStore('files', {}, 'private');
	api.on('systemPrompt', (_prompt, ctx) => {
		ctx.environment;
		ctx.getStore;
	});
});
```

API keys and runtime-extra keys are still required to be disjoint, matching
`combine(...)`.

## Extension Algebra

TODO: The `algebra/` folder can stand by itself as a stable, non-AI-specific
composition layer. Consider documenting and testing that boundary as its own
package-level surface.

Franklin models extension composition across three related surfaces:

- **ExtensionPoint**: a runtime-generic function from an internal registry writer to the author-facing `API<API, Runtime>` facade. It does not own storage; it only describes how to bind an API surface to a writer.
- **Registry**: an internal `Registry<API, Runtime>` effect log. Each contributed value is stored as `{ name, value }`, where `value` is the tuple passed to the registration method.
- **Compiler**: registry-view interpreter plus runtime builder. It exposes `compile<ContextRuntime>(view, getRuntime)`, which receives a `RegistryView<API, ContextRuntime>` with the compile context runtime restored while still returning the compiler's own `Runtime`.
- **Runtime**: lifecycle surface (`dispose`, `subscribe`) plus module-specific capabilities.
- **StateExtensionModule**: a factory for `emptyState()` and fresh compilers, plus the module's extension point, parameterized by an API (HKT). Orchestrator materialization composes the user module with small internal dependency modules so runtimes receive per-instance ports without each module parsing create/fork/child options.

Internally, the extension-point algorithm is:

```typescript
const { registry, writer } = createRegistry<MyAPI, Runtime>();
const api = createApi(extensionPoint, writer);
extension(api);
const runtime = await compiler.compile(createRegistryView(registry), getRuntime);
```

Extension points are usually declared with `createExtensionPoint<API>(keys)`,
where `keys` is an exhaustive map of the API contribution method names:

```typescript
const coreExtensionPoint = createExtensionPoint<CoreSignature>({
	on: true,
	registerTool: true,
});
```

The key map is checked against the method keys of `Apply<API, any>`, so typo
keys and missing registration methods fail typechecking. Extension points that
need non-registration API values can be declared directly as `(writer) => api`.

Compiler authors receive `RegistryView<API, Runtime>`, which provides typed
projections:

```typescript
const tools = view.argsFor('registerTool');
```

`argsFor` is an alias for `valuesFor` because registration effects store the
method argument tuple as the value. Effects remain in append order; ordering
policy belongs in the specific compiler/interpreter that needs it.

`combine(...)` merges these surfaces by product:

- Extension points are evaluated against the same writer and their API members are merged by object spread.
- State is merged by object spread.
- Compilers interpret their slice of the combined registry, then runtime lifecycle is recomposed while runtime extras are merged.

This composition is intentionally **partial**:

- it is only defined when the two operands have disjoint state keys
- it is only defined when the two operands have disjoint API keys
- it is only defined when the two operands have disjoint runtime-extra keys

The neutral element for this composition is the `Identity*` set:

- `IdentityAPI` (lifted with `StaticSignature<IdentityAPI>` at the module signature)
- `IdentityState`
- `IdentityRuntime`
- the empty identity extension point (`createExtensionPoint<IdentitySignature>({})`)
- `identityCompiler()`
- `identityModule()`

The important laws for the current algebra surface are:

- **Left identity**: combining identity on the left preserves the other operand.
- **Right identity**: combining identity on the right preserves the other operand.
- **Associativity**: intended for valid disjoint compositions, so regrouping does not change the resulting merged surface.

Left/right identity is tested explicitly for compiler, runtime, and harness module composition.

### Harness Orchestration

`Orchestrator` is the generic runtime collection and materialization
boundary. It takes a reduced module, a reduced extension list, and a runtime
collection. It owns create/materialize semantics:

- new runtimes start from `module.emptyState()`
- child and fork runtimes derive state via `module.state(source).child()` and
  `module.state(source).fork()`
- supplied overrides are resolved after derivation
- extensions are applied to the final composed API before the runtime is built
- the built runtime is inserted into the collection

The orchestrator folds in two internal dependency-backed runtime ports before compiling
extensions:

- `self`, which exposes the runtime id
- `orchestrator`, which exposes a narrow runtime-facing port
  (`create/get/list/remove`)

These ports are implemented with the same dependency module used for
app-provided resources. This keeps runtime-aware API handlers on the final
composed runtime while the state type remains private to the orchestrator.

### Agent Composition Strategies

There are many places where you could plausibly compose simpler mechanics to create a specific agent behaviour. These solutions are largely functionally equivalent, so the choice is more of a complexity management decision. Here are some emergent patterns we have discovered and documented so far:

- **StateExtensionModule decoration for enforcing universal behaviour**:
	- _It may be easier to express the behaviour as a transformation over the Runtime as oppposed to using the API_
	- Examples:
    - `withAuth` decorates `CoreModule` so that: a) LLM credentials are automatically sent via Mini-ACP on agent build b) changes to credentials in the store automatically update credentials
    - [ ] `withAgentsMd`

## Extension Authoring Rules

These are architectural invariants, not conventions. They should eventually become ESLint rules.

### 1. Dependencies flow through the runtime

Extensions must not capture external dependencies via closure. App-level singletons (auth, database, settings) are surfaced as fields on the runtime by `createDependencyModule(...)` and read inside handlers via the `ctx` argument.

**Wrong** — closure capture:

```typescript
function createMyExtension(db: Database): Extension {
  return (api) => {
    // BAD: db captured from factory scope
    api.registerTool(querySpec, (_, ctx) => db.query(...));
  };
}
```

**Right** — dependency through the runtime:

```typescript
const databaseModule = createDependencyModule('database', db);

const myExtension: Extension<
	API<CoreSignature, DependencyRuntime<'database', Database>>
> = (api) => {
	api.registerTool(querySpec, (params, ctx) => ctx.database.query(params));
};
```

For app-level singleton services, prefer `createDependencyModule(...)` over hand-rolling a one-method API.

### 2. Don't call API methods within tool execution closures

The `api` object is a compile-time registration surface. It should not be called inside runtime closures (tool execute callbacks, event handlers). Instead, extract the needed capability from the API into a local binding, then capture that binding.

**Wrong** — API call in closure:

```typescript
const ext: Extension<MyAPI & API<CoreSignature, R>> = (api) => {
	api.registerTool(spec, (params) => {
		// BAD: api.getFoo() called at runtime
		return api.getFoo().bar(params);
	});
};
```

**Right** — extract then capture:

```typescript
const ext: Extension<MyAPI & API<CoreSignature, R>> = (api) => {
	const foo = api.getFoo(); // extracted at compile time
	api.registerTool(spec, (params) => foo.bar(params)); // captured binding
};
```
