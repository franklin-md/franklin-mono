# Markdown note operations

Shared host operations for existing vault Markdown notes. Paths are vault-relative;
missing notes and non-Markdown files reject rather than creating files.

- `readMarkdown(app, path)` returns the live editing buffer when available, otherwise
  `Vault.read`. It checks again for an opened buffer after the disk read completes.
- `editMarkdown(app, path, plan)` receives a synchronous planner returning
  `{ from, to, text }[]` and resolves to the number of edits applied. The offsets are
  UTF-16 character offsets into the supplied source, with an inclusive `from` and
  exclusive `to`. All ranges are validated and sorted before any edits are applied;
  overlapping edits, including insertions at the same position, reject.

The planner must calculate edits from its supplied source, without side effects.
It may run more than once: closed notes use an initial no-op check followed by a
fresh plan inside [`Vault.process`](https://docs.obsidian.md/Reference/TypeScript+API/Vault/process).
Never capture offsets from an earlier asynchronous read in the planner.

Open notes use one editor transaction, allowing the host to map the selection and
retain ordinary undo history. A note shown in multiple panes is edited once. A
buffer opened while a read or update is pending takes precedence over disk.
There is no cross-note transaction and no request-level diff ownership.

## Caller audit

Directive replacement uses this operation for both replacing all copies and
replacing a unique reference within one note. Other plugin write paths have
different contracts:

- Directive insertion uses an explicit live editor target and places the cursor
  after the inserted token. It remains a direct editor transaction.
- Diff acceptance/rejection updates CodeMirror diff state and baseline effects,
  including undo integration. It remains in the diff controller.
- The filesystem adapter accepts binary data, supports file creation, and feeds
  agent write notifications. It remains a filesystem operation.
- Inbox current-note capture chooses the most recent pane and captures its
  selection; its read path retains those pane-specific semantics.
- Persistence writes plugin JSON documents outside the note-editing flow.
