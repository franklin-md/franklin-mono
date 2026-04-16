# @franklin/extensions

Plugin system for Franklin's agent runtime. Extensions register tools, lifecycle handlers, and reactive stores that are compiled into client + server middleware.

## APIs
An API is intended to solve a particular class of problems. Implemented so far:
- **CoreAPI**: Extends a minimal agent loop with tools and context management.
- **StoreAPI**: Allows sharing state between agent-agent and agent-app
- **EnvironmentAPI**: Localizes agent actions within a sandboxed environement.
- **SessionAPI**: Let's the agent know it's position within an agent orchestration tree, and perform actions relative to it.
- **DependencyAPI<Name,T>**: Simple way for an extension to depend on an app-provided global resource, such as authentication, secrets or the app-level environment.


## Extension Algebra [TODO after reading about tagless style article]
- [ ] Extensions, APis, Compilers, Runtimes, RuntimeSystems
  - [ ] Mention of algebraic properties like associativity, composition, commutativity etc


### Agent Composition Strategies
There are many places where you could plausibly compose simpler mechanics to create a specific agent behaviour. These solutions are largely functionally equivalent, so the choice is more of a complexity management decision. Here are some emergent patterns we have discovered and documented so far:
- **RuntimeSystem decoration for enforcing universal behaviour**:
  - *It may be easier to express the behaviour as a transformation over the Runtime as oppposed to using the API*
  - Examples:
    - `withAuth` decorates CoreSytem so that: a) LLM credentials are automatically sent via Mini-ACP on agent build b) changes to credentials in the store automatically update credentials
    - [ ] `withAgentsMd`

## Extension Authoring Rules

These are architectural invariants, not conventions. They should eventually become ESLint rules.

### 1. Dependencies flow through the API

Extensions must not capture external dependencies via closure. All dependencies are provided through the API mechanism — i.e., through the `api` object passed to the extension function body. If a dependency is needed, it must be introduced as part of a `RuntimeSystem`'s API type.

**Wrong** — closure capture:
```typescript
function createMyExtension(db: Database): Extension {
  return (api) => {
    // BAD: db captured from factory scope
    api.registerTool(querySpec, () => db.query(...));
  };
}
```

**Right** — dependency through API:
```typescript
const databaseSystem = createDependencySystem('Database', db);

const myExtension: Extension<DependencyAPI<'Database', Database> & CoreAPI> = (api) => {
  const db = api.getDatabase(); // dependency from DependencyAPI
  api.registerTool(querySpec, (params) => db.query(params));
};
```

For app-level singleton services, prefer `createDependencySystem(...)` over
hand-rolling a one-method API family.

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
