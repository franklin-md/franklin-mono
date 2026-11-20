# Inline directives

Shared Obsidian infrastructure for `:::franklin:<name>:<uuid>:::` references.
After Chat starts, the plugin restores the registry and registers the Live
Preview, Reading mode and removal adapters. This extraction provides
infrastructure only; consumers register their own named renderers and own any
execution associated with their state.

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
- `definition.onRemoved(handler)` reports an instance when an edit removes the
  whole text of one of its references from a note. It returns an unsubscribe
  function. See [Removal](#removal) for which edits count.
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

## Removal

The removal extension reads each editor transaction's
[user event](https://codemirror.net/docs/ref/#state.Transaction^userEvent).
Only transactions tagged `input` or `delete`, other than `delete.cut`, count.
Such an edit reports a reference when the whole token lies within the text it
replaced:

| Edit | Reported |
| --- | --- |
| Backspace or Delete on a Live Preview widget | Yes |
| Deleting, typing over or pasting over a selection containing the token | Yes |
| Vim deletes such as `dd`; Obsidian's Vim adapter tags every edit `input.type.compose` | Yes |
| Cut, which usually moves a reference | No |
| Editing inside the token's text in Source mode | No; the broken text stops rendering |
| Typing beside the token | No |
| Pasting the same token back in the same edit | No |
| Tokens in code or escaped, which are not references | No |
| Undo, redo, other panes mirroring the edit, file sync and agent rewrites | No |

The tag decides, not who made the edit. Code that dispatches its own
transactions tagged `input` or `delete` reports removals too. Handlers run
synchronously after the editor update; thrown errors are logged and later
handlers still run. Other copies may remain; the vault is not indexed, so a
report does not establish that the instance is unreferenced.

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
Both use the same React host and preserve visible token text for unknown or
failed renderers. `createDirectiveRemovalExtension(registry)` reports
`onRemoved` from Source and Live Preview editors. None of these adapters
registers itself with the plugin.

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
