# Study Inbox

Inbox owns a plugin-lifetime question queue, saved preferences and answers,
Markdown-note context, source navigation, and the answer/composer view. Closing
the pane does not stop its queue. Selection capture adds a question without
editing the source note.

## Runtime and storage

- Each attempt uses `FranklinApp.createAgent()` with its own environment and
  in-memory stores, outside persisted Chat sessions. The runner disposes it in
  `finally`, including cancellation, credential errors and the two-minute
  request deadline. See the [SDK contract](../../../../../packages/agent/README.md).
- Concurrency is limited to 1–4 attempts. The controller saves running state
  before contacting the model and holds the slot until the runner settles.
  Removing a question cancels its attempt and removes its follow-ups. Unload
  cancels active work; interrupted questions become retryable failures.
- Model, reasoning and answer instructions are captured per question. New
  questions and follow-ups use current preferences; retries retain the original
  selection and instructions. Follow-up context contains only its ancestors,
  including their complete answer sections.
- `inbox.json` is written by a serialized, same-directory temporary-file rename.
  The document contains questions and preferences, without transcripts or keys.
  Reload waits for any previous Inbox instance to finish its writes before
  restoring the file. Failed saves remain visible. Capture preserves a
  question’s identity across retries.
- New writes use schema version 8. Madrid versions 1–6 retain their questions,
  groups, actions and Thought Dump data through migration. Version 7 files from
  Inbox base on main load into the same queue with empty group and action
  collections. Invalid files stay on disk for recovery. Chat and credentials
  settings can start while Inbox recovers.

## Source navigation (A08)

Capture reads the open editor buffer, including unsaved changes, and records
the note, heading, parent-list breadcrumbs, quote, positions and nearby text.
Pasted questions are located when their text occurs once. Otherwise capture
uses the current selection or cursor row. Tiny selections with at most three
non-whitespace characters capture the whole row.

Navigation first tries the saved exact position, then the closest exact quote.
After edits, a unique whitespace-normalized first-line prefix wins; otherwise
the best longest-common-subsequence line is selected, using saved-line proximity
to break ties. Blank quotes and matches with no shared characters do not select
unrelated text. Missing or renamed notes show a notice and retain the capture.

## Answer and composer behavior

Answers contain a direct answer, an optional title, and independently collapsed
detail sections. Legacy Markdown remains readable. `answer/format.ts` includes
all sections regardless of disclosure state. Only one card footer is focused;
Escape clears focus. Per-question drafts and disclosures survive switching or
collapsing cards, but are not persisted across pane closure or plugin reload.
Enter sends, Shift+Enter inserts a line, IME composition is left alone, and a
failed submission retains its draft. Pointer text selection and links retain
their native behavior; keyboard title/disclosure activation remains available
while text is selected. Shared prompt/model controls supply the compact UI.

## Verification

The Obsidian bundle tests exercise development and production output. The Inbox
persistence tests cover the upgrade from the standalone Inbox base writer in
[PR #312](https://github.com/franklin-md/franklin-mono/pull/312).
