# Quick edit

Run **Franklin: Quick edit** in a Markdown note's Live Preview, or assign it a
shortcut through **Franklin settings → Quick edit**. The command inserts
a highlighted prompt at the cursor. Selecting text first wraps that text
in place as the initial query. Repeating the command focuses the current prompt.

The highlight inherits the note's font and line height, with horizontal padding
and an inset accent outline. Empty prompts, hard newlines and soft wraps use the
same styling without reserving extra vertical space.

Opening or refocusing a prompt places the caret inside its query. Clicking an
empty prompt focuses its input. Left/Right can cross the hidden controls into the
surrounding note, where typing stays outside the highlight.

The focused empty prompt draws its caret through a CodeMirror layer, including
in Vim insert mode where the browser's native caret otherwise appears before the
uneditable placeholder. Its visible stroke is centred in the empty box with equal
top and bottom clearance that scales with the note font. The box retains the same
text alignment as a nonempty prompt. The layer temporarily replaces the host caret
only at that empty insertion point. Typing, moving outside, blurring or cancelling returns
caret rendering to the host; no placeholder characters are added to the note.

- Prompts show just the query, without a leading label.
- Enter submits a nonempty request; Shift+Enter inserts a newline. IME composition
  is left to the editor. Prompt keys are captured before outline keymaps. Enter
  outside the prompt retains its ordinary behaviour.
- Enter consumes selected request text before running the agent. Escape or deleting
  either directive boundary cancels the draft and restores the original text,
  selection and pending file-review differences. This also works for saved drafts
  that are not currently being composed. Deleting text inside the query edits it
  normally. Undo/redo retain their normal document and review-baseline effects.
- Running controls expose Stop; **Franklin: Stop quick edit** is also available.
- Successful runs remove the request control automatically. Agent changes stay in
  the existing file accept/reject flow.
- Failed and stopped requests retain a status and their prompt. Invoke **Quick edit**
  at the control to retry, or delete it. Cancellation can leave partial agent
  changes for file review.

## Presets

Run **Franklin: Quick edit presets** to open a compact icon chooser above the
caret. It has no default shortcut. Arrow keys select an action; Enter, Space or
click runs it immediately. Escape dismisses the chooser and restores editor focus.

The initial presets are **Expand**, **Add example**, **Condense** and **Outline**.
In **Franklin settings → Quick edit → Presets**, add, edit, delete or reorder
presets and choose their name, prompt, icon and color. Icons use a curated Lucide
catalog; colors use saved palette keys mapped to complete Tailwind classes.
Preferences use storage version 2, migrating existing model and instruction
settings and seeding the initial presets. An intentionally empty list stays empty.

Unlike the freeform command, presets leave selected note text in place. The
selection, or current row when nothing is selected, supplies context separately
from the saved prompt. The chooser captures the originating note, caret and
resolved prompts when opened; changing the note invalidates that capture. Selecting
an action prefills and submits through the same Quick Edit composer and execution
path. Later settings changes cannot change a saved request's prompt.

`@franklin/ui` supplies `CompactPopover` and `IconActionGroup`. The popover accepts
ordinary React children, including inputs and pickers. Only focused icon buttons
own action navigation keys. The shared Obsidian editor-popover host owns caret
tracking, host-window lifetime and focus restoration; apps own submission state.

## Deferred completion controls

The original design left a split pill after execution: a tick dismissed the request,
while a pencil reopened it for editing and another run. Those controls had a separate
lifecycle from the file's accept/reject controls. Dismissing a request did not resolve
its changes, and accepting or rejecting file changes did not resolve its request.
That made the final action ambiguous and the amend flow awkward after review.

The completion pill and its edit-again/dismiss buttons have been removed for now.
Success cleans up the directive and leaves file review as the final decision.
Reconsider the split pill only with a clear shared lifecycle for request completion,
amendment and file review.

The cursor is context, not a replacement boundary. Each independent agent reads
the current note, follows the configured instructions and vault guides,
and uses the existing `read_file` / `edit_file` tools. It can edit on the same line,
below the cursor, or elsewhere in the originating note as the request requires.
It has no shell or whole-file write tool, and write permissions cover that note
only. After verification it reports success or failure through `finish_edit`.

## Ownership and lifetime

- `interaction/` owns commands' editor behaviour, prompt boundaries, highlighting,
  keyboard bindings, review-baseline bookkeeping and pills.
- `execution/` owns uniqueness checks, request state, cancellation and independent
  Franklin agent lifetimes. It does not splice generated text into editor ranges.
- `settings/` owns model, reasoning, instructions and native shortcut configuration.
  Preferences are independent of Chat and Inbox and persist in `quick-edit.json`.
- `register.tsx` composes these parts and owns their plugin lifetime.

Requests persist in the directive registry. The prompt's source envelope is
`:::franklin:quick-edit:<id>:::<prompt><!--franklin-quick-edit-end:<id>-->`.
The hidden closing comment keeps text after the cursor outside the query and makes
unfinished drafts recoverable without saving plugin state on every keystroke.
Source mode shows the ordinary Markdown source; Reading mode shows stored request
status controls. Open the original note in Live Preview to compose or retry requests.

Submission saves the prompt before removing its temporary source envelope, then
flushes the note through `TextFileView.save()` before running tools. Saving locks
the request range, while edits elsewhere remain possible. The executor permits
one active run and requires one globally discoverable reference in its original
note. Discovery failures or duplicate references prevent execution. Restoring an
interrupted run changes it to Stopped; mounting a widget never executes a request.

UI-only document changes are also mapped into the existing file review baseline.
This prevents creating, typing or removing a request from introducing additional
agent suggestions, while preserving existing agent differences. Baseline effects
participate in the existing diff undo integration. This is not a general solution
for distinguishing later user edits from agent edits; that remains separate work.

The existing edit tool's freshness rules remain in force. It refreshes its hash
after its own writes, while external changes require rereading the file. The agent
is instructed to reread and reassess after a freshness refusal.

See [independent agent lifetimes](../../../../../packages/agent/README.md#extensions),
[CodeMirror transactions](https://codemirror.net/docs/ref/#state.Transaction), and
[Obsidian TextFileView.save](https://docs.obsidian.md/Reference/TypeScript+API/TextFileView/save).
