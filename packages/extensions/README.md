# @franklin/extensions

Plugin system for Franklin's agent runtime. Extensions register tools, lifecycle handlers, and reactive stores that are compiled into client + server middleware.

## APIs
An API is intended to solve a particular class of problems. Implemented so far:
- **CoreAPI**: Extends a minimal agent loop with tools and context management.
- **StoreAPI**: Allows sharing state between agent-agent and agent-app
- **EnvironmentAPI**: Localizes agent actions within a sandboxed environement.
- **SessionAPI**: Let's the agent know it's position within an agent orchestration tree, and perform actions relative to it.
- **DependencyRuntime<Name,T>**: Simple way for an extension to depend on an app-provided global resource (authentication, secrets, app-level environment). The dependency lands on the runtime as a field keyed by `Name`, so handlers read it via `ctx.<name>`.


## Extension Algebra

Franklin models extension composition across three related surfaces:
- **Compiler**: compile-time registration surface plus runtime builder.
- **Runtime**: lifecycle surface (`state.get`, `state.fork`, `state.child`, `dispose`, `subscribe`) plus system-specific capabilities.
- **RuntimeSystem**: a factory for `emptyState()` and fresh compilers.

`combine(...)` merges these surfaces by product:
- API members are merged by object spread.
- State is merged by object spread.
- Runtime lifecycle is recomposed while runtime extras are merged.

This composition is intentionally **partial**:
- it is only defined when the two operands have disjoint state keys
- it is only defined when the two operands have disjoint API keys
- it is only defined when the two operands have disjoint runtime-extra keys

The neutral element for this composition is the `Identity*` family:
- `IdentityAPI`
- `IdentityState`
- `IdentityRuntime`
- `identityCompiler()`
- `identitySystem()`

The important laws for the current algebra surface are:
- **Left identity**: combining identity on the left preserves the other operand.
- **Right identity**: combining identity on the right preserves the other operand.
- **Associativity**: intended for valid disjoint compositions, so regrouping does not change the resulting merged surface.

Left/right identity is tested explicitly for compiler, runtime, and runtime-system composition.


### Agent Composition Strategies
There are many places where you could plausibly compose simpler mechanics to create a specific agent behaviour. These solutions are largely functionally equivalent, so the choice is more of a complexity management decision. Here are some emergent patterns we have discovered and documented so far:
- **RuntimeSystem decoration for enforcing universal behaviour**:
  - *It may be easier to express the behaviour as a transformation over the Runtime as oppposed to using the API*
  - Examples:
    - `withAuth` decorates CoreSytem so that: a) LLM credentials are automatically sent via Mini-ACP on agent build b) changes to credentials in the store automatically update credentials
    - [ ] `withAgentsMd`

## Extension Authoring Rules

These are architectural invariants, not conventions. They should eventually become ESLint rules.

### 1. Dependencies flow through the runtime

Extensions must not capture external dependencies via closure. App-level singletons (auth, database, settings) are surfaced as fields on the runtime by `createDependencySystem(...)` and read inside handlers via the `ctx` argument.

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
const databaseSystem = createDependencySystem('database', db);

const myExtension: Extension<CoreAPI<DependencyRuntime<'database', Database>>> = (api) => {
  api.registerTool(querySpec, (params, ctx) => ctx.database.query(params));
};
```

For app-level singleton services, prefer `createDependencySystem(...)` over hand-rolling a one-method API family.

### 2. Don't call API methods within tool execution closures

The `api` object is a compile-time registration surface. It should not be called inside runtime closures (tool execute callbacks, event handlers). Instead, extract the needed capability from the API into a local binding, then capture that binding.

**Wrong** — API call in closure:
```typescript
const ext: Extension<MyAPI & CoreAPI> = (api) => {
  api.registerTool(spec, (params) => {
    // BAD: api.getFoo() called at runtime
    return api.getFoo().bar(params);
  });
};
```

**Right** — extract then capture:
```typescript
const ext: Extension<MyAPI & CoreAPI> = (api) => {
  const foo = api.getFoo(); // extracted at compile time
  api.registerTool(spec, (params) => foo.bar(params)); // captured binding
};
```
