# Inline directives

Shared Obsidian infrastructure for `:::franklin:<name>:<uuid>:::` references.
After Chat starts, the plugin restores the registry and registers Live Preview
and Reading mode adapters. This extraction provides infrastructure only; consumers register their
own named renderers and own any execution associated with their state.

## API

- `DirectiveRegistry.create({ app, persistence })` restores instances before use.
- `registry.registerDirective<T>(name, Renderer)` defines a named directive.
  The renderer receives `{ id, state: T, update }` and must produce inline-compatible
  React content. Registration does not start jobs.
- `definition.create(state)` persists JSON-compatible state and returns an instance
  with `id`, `text`, reactive `state`, and `update(recipe)`.
- `definition.get(id)` restores a typed handle; another directive's ID returns
  `undefined`. The application owns the shape of `T` across releases.
- `definition.instances()` enumerates persisted instances belonging to that definition,
  including those restored from disk.
- `instance.update(recipe)` uses Franklin's store recipe convention. Updates are
  serialized and become visible after a successful save. Failed saves reject and
  leave the previous state available. Subscriber errors are reported separately.
- `captureDirectiveTarget(editor, view, line)` tracks the end of the original line
  through CM6 transactions while saves are pending. Pass it to `scribe.write(target)`
  to append with spacing, then dispose the target. The write leaves the cursor
  alone and returns the inserted reference as a `{ path, from, to }` snapshot.
  Deleted lines, closed editors and literal Markdown regions reject insertion.
- `scribe.replace(markdown)` replaces all matching references in Markdown notes.
  Its receipt contains `replacements`, `filesChanged`, and per-file `failures`.
  Zero matches is a successful no-op. Code examples and frontmatter are excluded.
- `scribe.find()` returns `{ locations, failures }` across Markdown notes, using live
  editor buffers when available. Locations are `{ path, from, to }` snapshots with
  UTF-16 character offsets (`from` inclusive, `to` exclusive), not durable anchors.
  Check `failures` before assuming the results establish uniqueness. Each note is
  searched once regardless of how many panes show it.
- `registry.dispose()` rejects new mutations, drains accepted saves, and releases
  renderer registrations and subscribers.

## Persistence and rendering

`createDirectivePersistence({ path })` uses the existing single-file
persister with an atomic file replacement. Supply `<plugin-dir>/directives.json`.
Unreadable or unsupported documents stay intact. Chat and settings remain available.
After a plugin reload, restoration waits for previously accepted saves.
State remains stored after text deletion/replacement so copied references and
editor undo can still resolve it. Instance garbage collection remains deferred.
Consumers own execution and reference cleanup, including retrying failed note
edits after a saved deletion. Restoring an instance does not start application jobs.

`createDirectiveExtension(registry)` supplies Live Preview replacement widgets
and [CodeMirror atomic ranges](https://codemirror.net/docs/ref/#view.EditorView%5EatomicRanges).
Source mode remains ordinary text. `createDirectivePostProcessor(registry)`
supplies Reading mode rendering with Markdown-section lifecycle cleanup.
Neither adapter registers itself with the plugin. Both use the same React host
and preserve visible token text for unknown or failed renderers.

Copied tokens share one instance state. Reading mode leaves tokens as text when
section source is unavailable or escaping makes their identity ambiguous.

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
