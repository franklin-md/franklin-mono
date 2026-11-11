# Inline directives

Shared Obsidian infrastructure for `:::franklin:<name>:<uuid>:::` references.
Plugin bootstrap restores the registry and registers Live Preview and Reading mode
adapters. Inbox is the first consumer, rendering a question status pill from a
persisted question ID.

## API

- `DirectiveRegistry.create({ app, persistence })` restores instances before use.
- `registry.registerDirective<T>(name, Renderer)` defines a named directive.
  The renderer receives `{ state: T, update }` and must produce inline-compatible
  React content. Registration does not start jobs.
- `definition.create(state)` persists JSON-compatible state and returns an instance
  with `id`, `text`, reactive `state`, and `update(recipe)`.
- `definition.get(id)` restores a typed handle; another directive's ID returns
  `undefined`. The application owns the shape of `T` across releases.
- `definition.instances()` enumerates persisted instances belonging to that definition,
  including those restored from disk.
- `instance.update(recipe)` uses Franklin's store recipe convention. Updates are
  serialized and become visible after a successful save. Failed saves reject and
  leave the previous state available.
- `new DirectiveScribe(instance).write()` inserts at the current primary cursor,
  advances the cursor past the token, and returns the note path.
- `captureDirectiveTarget(editor, view, line)` tracks the end of the original line
  through CM6 transactions while saves are pending. Pass it to `scribe.write(target)`
  to append with spacing while preserving the current selection, then dispose the
  target. Deleted lines, closed editors and literal Markdown regions reject insertion.
- `scribe.replace(markdown)` replaces all matching references in Markdown notes.
  Its receipt contains `replacements`, `filesChanged`, and per-file `failures`.
  Zero matches is a successful no-op. Code examples and frontmatter are excluded.
- `scribe.find()` returns `{ locations, failures }` across Markdown notes, using live
  editor buffers when available. Locations are `{ path, from, to }` snapshots with
  UTF-16 character offsets (`from` inclusive, `to` exclusive), not durable anchors.
  Check `failures` before assuming the results establish uniqueness. Each note is
  searched once regardless of how many panes show it.
- `scribe.replaceOne(path, markdown)` replaces exactly one matching reference in
  that note. Missing notes, zero matches and multiple matches produce a failure
  receipt without modifying the note. Uniqueness is checked again against current
  contents during replacement. Copies in other notes are untouched.
- `registry.dispose()` rejects new mutations, drains accepted saves, and releases
  renderer registrations and subscribers.

## Persistence and rendering

`createDirectivePersistence({ filesystem, path })` uses the existing single-file
persister with an atomic file replacement. Supply `<plugin-dir>/directives.json`.
Unreadable or unsupported documents reject restoration without overwriting them.
State remains stored after text deletion/replacement so copied references and
editor undo can still resolve it. Instance garbage collection remains deferred.
Inbox owns question execution and removes references after saved deletion, retrying
failed note cleanup on subsequent Inbox saves or startup.

`createDirectiveExtension(registry)` supplies Live Preview replacement widgets
and [CodeMirror atomic ranges](https://codemirror.net/docs/ref/#view.EditorView%5EatomicRanges).
Source mode remains ordinary text. `createDirectivePostProcessor(registry)`
supplies Reading mode rendering with Markdown-section lifecycle cleanup.
Neither adapter registers itself with the plugin. Both use the same React host
and preserve visible token text for unknown or failed renderers.

Copied tokens share one instance state. Reading mode conservatively preserves
literal text when Markdown escaping makes source and rendered references ambiguous.

Open documents are updated through editor transactions; closed notes use
[`Vault.process`](https://docs.obsidian.md/Plugins/Vault). Replacement is performed
against current contents, once per note even when it is open in multiple panes.
There is no cross-note transaction or global undo. Finishing a job and replacing
its reference is an application action; restoring a completed widget does not
repeat that action.

Discovery and replacement share the source-level directive matcher. Replacement
does not apply offsets from a prior `find()` call. The host-specific read and edit
operations live in [`shared/obsidian/markdown`](../obsidian/markdown/README.md);
directive syntax and matching remain owned here.
