# @franklin/extensions

Plugin system for Franklin's agent runtime. Extensions register tools, lifecycle handlers, and reactive stores that are compiled into client + server middleware.

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
// A RuntimeSystem introduces the dependency as part of its API
const myExtension: Extension<DatabaseAPI & CoreAPI> = (api) => {
  const db = api.getDatabase(); // dependency from DatabaseAPI
  api.registerTool(querySpec, (params) => db.query(params));
};
```

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
