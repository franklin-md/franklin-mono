# Study Inbox

Inbox owns a plugin-lifetime question queue, saved settings and answers,
Markdown-note context, source navigation, and the answer/composer view. Closing
the pane does not stop its queue. Inline capture adds a question to the queue
and puts a status pill beside its source selection.

## Runtime and storage

- Each attempt uses `FranklinApp.createAgent()` with its own environment and
  in-memory stores, outside persisted Chat sessions. The runner disposes it in
  `finally`, including cancellation, credential errors and the two-minute
  request deadline. See the [SDK contract](../../../../../packages/agent/README.md).
- Concurrency is limited to 1–4 attempts. The controller saves running state
  before contacting the model and holds the slot until the runner settles.
  Removing a question cancels its attempt and removes its follow-ups. Unload
  cancels active work; interrupted questions become retryable failures.
- A failure saves its message and, when a model turn or credential check ended
  the attempt, its stop code. Questions, actions and extractions render failures
  through Chat's turn-end renderers with their Retry and Dismiss controls. A
  missing key or a rejected sign-in, such as a reused OAuth refresh token,
  offers **Open connections**; other credential failures, such as an outage,
  show their message. Failures saved without a stop code render as generic
  errors. A note's status pill reads **Failed**; hovering or focusing it shows
  the same failure.
- Model, reasoning and answer instructions are captured per question. New
  questions and follow-ups use the current settings; retries retain the original
  selection and instructions. Follow-up context comes from the ancestor
  questions, including their complete answers, and the enclosing groups.
- `inbox.json` holds questions, groups, thought dumps and action runs.
  `inbox-settings.json` beside it holds the model, reasoning, answer
  instructions, concurrency, composer mode and action definitions. Both are
  written by a serialized, same-directory temporary-file rename. Reload waits
  for any previous Inbox instance to finish its writes before restoring them.
  Failed `inbox.json` saves remain visible with **Retry save**. A settings
  change applies only once saved; a failed one is reported where it was made.
  Resending the same question, including after removing checklist formatting,
  keeps its original ID.
- New `inbox.json` writes use schema version 12. Flat-question versions 1–7
  keep saved instructions and answers. Version 8 retains saved action
  definitions and pending runs. Version 9 adds empty action collections on
  migration. Version 11 gives saved actions and pending runs an icon and color;
  earlier actions migrate to a blue sparkles icon. Version 12 moves the
  settings to `inbox-settings.json` (version 1): the first load after upgrading
  saves the settings an older `inbox.json` held, then rewrites it without them.
  An existing settings file is kept. Inbox preserves the original files if
  validation fails. Chat and credentials settings can open while Inbox
  recovers.

## Groups and Thought Dump

Switch the Inbox composer to **Thought dump** to organize several questions from
one passage. The extraction snapshots the model, reasoning and answer
instructions before joining the same concurrency queue as ordinary questions.
It saves the group and questions together. Each question then runs independently
with its ancestor questions and group context. A failed extraction stays in the
feed with retry and dismiss controls.

Groups retain their fold state across reload. Folding keeps drafts and active
questions intact. Deleting a group removes its descendants and cancels their
active attempts.

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

Open **Franklin: Open inbox capture chooser** in a Markdown editor to add one
question or send a Thought Dump from the captured selection. Quick add returns
focus to the editor. Both Quick add and **Add selection to study inbox** place
the cursor after the new pill, unless the selection moved or the note was edited
while the question saved. A saved question's inline pill tracks its
progress, previews the answer, and opens its card in the Inbox. If directive
storage is unavailable, **Add selection to study inbox** still queues the
question.

### Deleting a pill

Deleting a pill in the editor deletes its question and follow-ups, then removes
the pill's other copies from notes:

| Edit in the note | Question |
| --- | --- |
| Backspace or Delete on the pill | Deleted |
| Deleting, typing over or pasting over a selection containing the pill | Deleted |
| Vim deletes such as `dd`, also when followed by `p` | Deleted |
| Cut, including cut and paste to move the pill | Kept |
| Editing inside the pill's text in Source mode | Kept; the text stops rendering as a pill |
| Undo, redo, sync and agent edits | Kept |

Undo restores the text but not the question, so the pill reads
**Question deleted**, as do copies pasted later. To remove a pill and keep its
question, cut it. The rules are in [Inline directives](../../shared/directives/README.md#removal).

## Configurable actions

In **Franklin settings → Inbox → Actions**, add, edit, delete or reorder actions
and choose their name, prompt, Obsidian icon and color. The list and editor are
shared with Quick Edit presets (`src/shared/preset/`). On an answered question,
select an action's button, which shows its icon, to start an independent agent
with the saved answer, source context and the Inbox model and reasoning. Set
those in **Franklin settings → Inbox** or the composer; both edit one preference.
Actions can read and edit vault files and run commands within the configured
environment. Failed runs retain their original context and can be retried or
dismissed. Completed effects are recorded before the run is cleared.

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

## Development diagnostics

Development builds show an inspect button on each card. It copies the agent
inspect dump of the question's latest settled attempt, the same dump Chat's
inspect button copies: system prompt, messages with tool calls and results,
tools, and model configuration without the API key. Dumps for the 20 most
recently settled questions are kept in memory only and are lost on reload.

## Scope and verification

Local PDF reference reading uses the existing shared host API.

Run the Obsidian tests and the SDK agent-factory tests, then the root build,
lint and formatting checks. The Obsidian bundle tests exercise development and
production output without installing or reloading a vault plugin. Frozen
handoff snapshots in `.context/` are inputs, not TypeScript project sources;
exclude them from typed lint. Native Obsidian behavior, real provider access,
narrow-width geometry and both host themes still require installed-host review.
