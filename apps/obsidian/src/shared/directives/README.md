# Inline directive core

Shared Obsidian infrastructure for `:::franklin:<name>:<uuid>:::` references.
This layer provides the registry, instance persistence, and source syntax.
Host rendering and note-reference operations are supplied by the editor integration.
No app-specific directive or job is registered by this layer.

## Registry API

- `DirectiveRegistry.create({ app, persistence })` restores instances before use.
- `registry.registerDirective<T>(name, Renderer)` defines a named renderer receiving
  `{ id, state: T, update }`. Registration does not start jobs.
- `definition.create(state)` persists JSON-compatible state and returns an instance
  with `id`, `text`, reactive `state`, and `update(recipe)`.
- `definition.get(id)` restores a typed handle; IDs belonging to another directive
  return `undefined`. Applications own their state schema across releases.
- `definition.instances()` enumerates persisted instances for that definition.
- `instance.update(recipe)` serializes updates and publishes only successfully
  saved state. Failed saves reject and leave the previous state available.
- `registry.dispose()` rejects new mutations, drains accepted saves, and releases
  renderer registrations and subscribers.

## Persistence and syntax

`createDirectivePersistence({ path })` restores the registry from
`<plugin-dir>/directives.json` and saves through atomic file replacement. Unreadable
or unsupported documents reject restoration without overwriting stored bytes.
Deleting reference text does not remove its persisted state, so copied references
and editor undo can retain their identity. Instance garbage collection is deferred.

`formatDirective(name, id)` produces reference text. `parseDirectives(source)`
returns tokens with UTF-16 source offsets, excluding frontmatter, escaped examples,
code, HTML, and URL literals. Syntax uses the
[Lezer Markdown parser](https://github.com/lezer-parser/markdown).
