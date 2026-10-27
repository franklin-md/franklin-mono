# Personal study inbox

The Obsidian plugin now includes a functional study inbox alongside the existing chat. Storybook still supplies an isolated visual demo with simulated answers. Both render the same feed, composer, and question components.

## Use

1. Build with `npm run bundle -w @franklin/obsidian`, then install the generated `main.js`, `styles.css`, and `manifest.json` from `apps/obsidian/dist` using the [plugin instructions](../apps/obsidian/README.md).
2. Open **Franklin: Open study inbox** or the inbox ribbon icon.
3. Select a model. The model list reuses Franklin's catalog, and the inbox keeps its own default. Sign in or add the provider's key in Franklin settings; inbox options link there.
4. Type a question and press Enter. Shift+Enter adds a line. Up to four independent agents can work concurrently; the default is three.
5. Select text in a Markdown note and run **Franklin: Add selection to study inbox**. The selection becomes the question; passages are explained briefly. Use Franklin settings → Study inbox → Configure shortcut to open the command in Obsidian’s hotkey editor (for example, assign Cmd/Ctrl+Shift+I). No default binding overrides existing shortcuts.
6. Click a question to focus it: its full answer and a simple follow-up field appear together. Only one question is focused; clicking another collapses the previous one, and Escape clears focus. Draft follow-ups survive switching questions. Answer text remains selectable. Open its source quote, then **Open source note** to return to the selection. Parent labels navigate within the feed.

Root questions are newest first, grouped by local calendar day. Follow-ups remain with their root and preserve their parent, source, model, and timestamps. New follow-ups use the current inbox model and response preference. Retry retains the failed question's original configuration.

## Execution and extensions

The implementation uses Franklin's existing core, environment, references, configuration, and store modules with `compile`, the normal Mini-ACP RPC connector, and the existing auth manager. Each question/attempt gets a fresh runtime. It has a study prompt and a validated `return_answer({ title, answer })` tool, plus the existing `read_file`, `glob`, `grep`, `search_web`, and `fetch_url` tools. Reads use the Obsidian filesystem/locator bridge, including wikilinks and the existing text, image, and PDF reference providers. Web search uses the same Exa provider and DuckDuckGo fallback as chat. The agent has no file editing, shell, or subagent tools.

Questions typed or pasted into the top composer capture the most recently active Markdown note, even while the inbox sidebar has focus. A unique occurrence of the pasted question locates the source precisely; otherwise capture uses the note selection or cursor. The open editor buffer takes precedence over disk. Captures include heading and parent-list breadcrumbs, so a task nested under “System Call Mechanism → Same entry point” retains those referents even beyond the nearby text window. Checkbox syntax is removed from single-line questions; the captured quote remains exact. The prompt directs the agent to resolve references from that context, read the source or linked notes when needed, and cite sources consulted during research.

The answer tool supplies a concise question header and answer together, without a separate model request. The prompt asks for minimal rewriting: keep wording and technical terms, add words needed to make fragments into a question, and retain all distinct topics. Headers are plain text, single-line, and at most 180 characters; the layout wraps them within the pane. The original submitted text remains unchanged and is available under **Original question** when a renamed question is focused. Older saved questions load without a generated header and display their wording with checklist markers removed.

The question-context builder, answer extension, runtime runner, and shared controller are in `apps/obsidian/src/inbox`. The controller's Franklin reactive store drives the UI and receives answers through a callback bound to the question ID and attempt ID. The model never supplies application identifiers. Empty answers, repeated submissions, cancelled/deleted requests, and superseded attempts are rejected. The first accepted answer wins.

An answer submission updates the feed, but the concurrency slot stays occupied until the agent stream and runtime disposal settle. Finishing without `return_answer` becomes a retryable failure. Provider/authentication failures surface in the question. Each request has a two-minute timeout and cancellation on deletion or plugin unload. Closing a pane leaves the queue running while Obsidian remains open.

In **Franklin settings → Study inbox → Answer instructions**, replace the text with your preferred answer style and choose **Save instructions**. **Reset to default** saves “Give a focused explanation with a small example when useful.” An empty field adds no answer-style instruction. The inbox toolbar links to settings and shows the saved text on hover. Each new question and follow-up captures the current instructions; queued questions and retries keep their captured wording. The internal context, research and answer-submission instructions remain part of the agent prompt. Answers render with Franklin's existing Markdown/math renderer.

Relevant SDK contracts: [agent architecture](../packages/agent/README.md), [core runtime](../packages/agent/src/modules/core/runtime/types.ts), [tool registration](../packages/agent/src/modules/core/api/tool.ts), and [store API](../packages/agent/src/modules/store/api/types.ts).

## Persistence and lifecycle

The versioned inbox document is saved in `<plugin-dir>/inbox.json`. Dedicated research/capture sidecars are described below; they do not change the inbox schema. It contains preferences, question/answer text, source snapshots and positions, lineage, attempts, and timestamps. Credentials, reasoning traces, raw tool outputs, and agent transcripts are excluded from `inbox.json`. The agents do not join the normal persisted chat-session collection or register persistent per-agent stores. File-read hashes use a separate in-memory registry per attempt; research responses are not written to the inbox document. Future question attempts retain bounded tool-visible evidence in separate sidecars. This avoids adding orphaned session/store logs for inbox questions.

Writes are serialized and use a temporary file in the same directory followed by an atomic rename. Questions are saved before submitting model requests. Save errors are visible, pause new work, and offer **Retry save**. Corrupt or newer-version files are preserved and reported at startup rather than replaced with empty data. The original file must be recovered or moved aside before reload.

Queued work resumes on startup. Interrupted running work becomes failed with an explicit retry, avoiding automatic duplicate requests. Completed answers survive restarts. Deleting a question cancels active work and removes it and its descendants from the rewritten document; late results cannot recreate them. No pre-existing chat sessions, stores, or vault notes are deleted.

Source snapshots retain an exact quote, file path, heading and parent-list breadcrumbs, selection range, nearby text, capture time, and source ID. Navigation checks the old position, then searches for a unique matching quote after edits. Missing notes, ambiguous matches, or changed quotes are reported; the captured quote remains available. File renames are not tracked automatically yet.

## Validation and remaining scope

Regression coverage includes concurrent/out-of-order answers, slot ownership after submission, retries and stale attempts, source inheritance and branch isolation, deletion during work, restore behavior, disk write errors, malformed storage, actual Franklin tool execution/auth/error/cancellation, Obsidian selection commands, source navigation after edits, and UI submission/follow-ups, single-question focus, draft preservation, selection/link interactions, nested task context, composer note capture, and file/web research through the actual tool path. Disk integration tests verify that deletion removes content and that secrets/transcripts are absent.

PDF selection, sync, an always-on service, automatic compaction, and harness migration remain deferred. Follow-up context uses only its ancestor chain; this version has no automatic summarization for very long threads. The working plugin requires a configured provider; automated tests use deterministic model fixtures rather than paid inference.

## Configurable actions

In **Franklin settings → Inbox actions**, add a name (including an emoji) and a prompt. Each answered question displays those actions beneath its answer, including when collapsed. An action receives that question's answer, captured source and ancestor branch. Like ordinary follow-ups, this reconstructs the saved branch context rather than retaining the original model transcript.

Actions use the model currently selected in the inbox and share its concurrency limit. Their runtime adds `edit_file`, `write_file` and `bash` to the existing research tools. It reads the workflow prompt files named in your action and applies the requested edits directly. An action has up to two hours to finish; ordinary questions retain their two-minute deadline. The `finish_action` tool reports either verified success or a failure reason.

There is at most one outstanding run for each action/question pair. Duplicate clicks reuse the same run. Editing or deleting a definition affects future starts; queued and failed runs retain their original prompt, model and source snapshots. A failed run offers Retry and Dismiss. Retry preserves its run ID and configuration, while starting a later successful action creates a new run ID. Deleting a question cancels its runs along with those of its descendants.

Successful runs disappear after their completion checkpoint is saved, and Obsidian displays a brief result notice. The original question and action definition remain. Completed checkpoints are cleaned on restart without rerunning them. Queued actions resume; interrupted actions require explicit retry. As direct file edits can precede a failure or interruption, prompts should inspect existing output before repeating changes. The app prevents duplicate concurrent runs; arbitrary external effects are not transactional.

All definitions and outstanding runs live alongside questions in version 3 of `inbox.json`. Version 1 data migrates with empty action lists. Versions 1 and 2 migrate their terse/full preferences and every saved question snapshot to the equivalent editable instruction text, including question and ancestor snapshots in outstanding action runs. No credentials or model transcripts are added to the document.

For a flashcard action, use **🃏** as its name and a prompt such as:

```text
Read [[Flashcard Design Prompt]], [[Mochi Workflow]], and
Agents/prompts/Flashcard Proposals.md. Apply their card-design,
source-context, duplicate-checking and review guidance to this question
and answer only. Adapt the batch instructions to this single question;
edit the files directly.

Append suitable proposals, unchecked, to Ledger/Flashcard Inbox.md.
Preserve existing entries and allocate IDs using the inbox's next_id.
Include source links. Verify the saved output, then report the number
of proposals and link to the inbox. If retrying, inspect existing
proposals first to avoid duplicating partial work. Leave export to
Mochi for my review.
```

This uses the vault's prompt files as guidance. It does not invoke or modify the scheduled flashcard automation. **Obsidian → Inbox actions → Sidebar / Settings** in Storybook demonstrates the configured controls with a simulated run and in-memory storage.


## Flashcard training capture

**Record → author/save in Mochi → Stop (or Record another answer)** automatically collects a learning episode: the original question, answer, captured source and ancestor branch, original research, and the matching saved card set. Starting another recording completes the previous one at the switch click time. Nonempty recordings save immediately; empty recordings create no episode file or completed index entry. Obsidian notifications report Start, completion/card count, and empty results. Errors use the existing error notifications and leave a **Retry recording** control. A failed completion blocks replacement so its evidence remains recoverable. One episode may contain several cards and concepts. The host owns recording deterministically; configured agent actions keep their existing behavior.

Record pins the accepted question/attempt IDs, source/answer/ancestor snapshots, settings, UTC start time, and the IDs of open Mochi drafts (`new? = true`). Stop persists the exclusive end time before querying Mochi. Candidates are saved cards created in **`start <= card.created_at < end`**, plus a draft remembered at Record that is now saved with **`start <= card.updated_at < end`**. Winning document revisions and current content at collection time are used. Unfinished drafts are excluded. Earlier saved cards edited during the interval are excluded because they were not in the draft baseline. Tombstones and trashed cards are excluded; archived cards remain candidates. Template fields, template/deck documents, revision identity, decoded card bodies and attachment references are retained. Timestamp association does not establish topic or authorship. Version 4 captures matching cards automatically, so unrelated, imported or synced creations in the same window can be included; the saved association explicitly does not claim user review.

This handles Mochi's Save and New behavior observed on 2026-10-22: it immediately persists a blank card, then later sets `new?` to false and `updated-at` when the user saves it. Using creation time alone selected the next blank card and missed the authored card. Since capture version 3, recordings retain the baseline and each card's `matchedBy`/`updatedAt`. It does not infer first-save history from revision numbers: Mochi may compact predecessor bodies. Old pending recordings without a baseline retain their original behavior unless explicitly recovered; a manual recovery records its actual time, source and explanation instead of claiming it was observed at Record.

Settings live in **Franklin → Flashcard capture**. The collection folder defaults to `Flashcard Training Examples`, relative to the vault; a recording pins its folder and database path. Folder traversal, paths outside the vault, and the vault configuration directory are rejected, including redirects through symlinks. Mochi's default path is `~/Library/Application Support/mochi/mochi.db`. This macOS implementation uses the `node:sqlite` binding verified in Obsidian 1.14.4 / Electron 39 (Node 22.22.1), without a native-addon dependency or Python. Reads use `readOnly`, `query_only`, bound integer parameters and a short transaction, with a 500 ms busy timeout. There are no checkpoints, separate DB/WAL copies, `immutable=1`, HTTP calls or Mochi writes. See [SQLite WAL](https://sqlite.org/wal.html#read_only_databases).

The database schema and integer timestamp encoding are validated; missing/locked databases and unsupported formats fail visibly. Recording refuses to start if its draft baseline cannot be read or exceeds 1,000 drafts. Candidate collection fails rather than silently discarding more than 1,000 matching documents or 16 MB of card bodies. The database is an internal Mochi format, so future versions may need an adapter update. An unavailable Electron SQLite binding reports an actionable error. Only locally committed state is visible. The reported real-card save was visible at Stop; its draft creation timestamp caused the miss. Tests also cover delayed visibility and ensure retries never widen the original interval. A preexisting draft's eligibility uses its latest saved update time; save it before Stop or switching recordings. A successful empty query completes and discards the recording; it is not retained for a later collection retry.

### Evidence and completeness

Each future question attempt writes `<plugin-dir>/inbox-research/<identity-hash>.json`. Core `toolCall` / `toolResult` observers capture the arguments and actual visible responses of `read_file`, `glob`, `grep`, `search_web`, and `fetch_url`, with call/result timestamps and source paths/URLs. The original user prompt, assembled system prompt, model selection and ancestor snapshots are retained. No model stream/reasoning, authentication configuration, transport object, or binary tool payload is saved. Known provider credentials and recognizable credential/header/URL forms are redacted.

Tool evidence is bounded to 256 calls, 64,000 characters per text field, and 1,000,000 retained text characters per attempt. Each truncated field records its omitted-character count; omitted events and binary content are explicit. The accepted-answer checkpoint is saved before publishing the answer, so Record can freeze its original research while the agent stream finishes. Interrupted, missing, unreadable or mismatched-attempt/branch evidence stays explicitly partial/missing. Old answers use their saved question/source/answer and a labelled reconstructed prompt. Research is never rerun to manufacture historical context. These local sidecars retain note excerpts even when a question is later deleted; they are separate evidence storage, not chat sessions.

### Episode files and recovery

`<plugin-dir>/capture.json` is the versioned recovery journal, separate from `inbox.json`. It retains the active/incomplete recording, complete pinned context, all collected snapshots and settings, plus a metadata index of completed nonempty episodes. Reload recovers a recording, stopped window or save without starting another recording or rerunning agent work. Legacy pending reviews and their stored exclusions still restore and finish on Stop or the next Record; no new review step is shown. Malformed/newer journals are preserved and recording is disabled until recovery. Deleting an inbox question leaves its recording and completed episodes intact.

A completed nonempty episode is one file: `<collection-folder>/<episode-id>.json`. It contains:

- `captureVersion`: currently `4`, identifying the capture technique used to assemble the episode. Increment `CAPTURE_VERSION` in `capture/version.ts` whenever research collection, card matching/decoding, retained evidence, or the episode format changes. The source comment records this requirement. This version is separate from the internal recovery journal and evidence schema versions. Fresh card snapshots also record their capture version, distinguishing them from legacy snapshots retained during recovery.
- `draftBaseline`: the open draft IDs, actual baseline capture time, and source (`record-start` or an explicitly annotated `manual-recovery`). Old recordings may have no baseline.
- Identities, pinned question/ancestor snapshots, UTC recording window, `completedAt`, `completionMode: "automatic"`, captured/candidate IDs and final `phase: "complete"`.
- `context`: readable Markdown for the original question, answer, source/ancestor context, answer instructions and completeness.
- `research`: structured original research records, provenance and omission metadata.
- `cards`: the matched cards from the latest snapshot (retaining any exclusions already recorded by a legacy review), with its actual snapshot time range retained alongside them.
- `snapshots`: unfiltered history, including legacy exclusions and collection retries, preserving raw evidence separately from the final card set inside the same file.

Previously saved episode files/directories remain valid; their journal references restore without moving or rewriting those examples. Legacy completion indexes with `confirmedAt` normalize to `completedAt`. New episode files omit legacy confirmation fields and use automatic completion metadata.

Attachment references remain in content/fields/raw bodies and metadata; `assets: "not-copied"` explicitly records that binary assets are unavailable. Missing deck/template documents are labelled. No training or model deployment is implemented.

All writes use same-directory temporary files and atomic rename. The journal checkpoints Start and Stop before dependent operations. The complete JSON file commits in one atomic rename, so context, research and cards cannot be partially published. Until the episode file and completion journal write both succeed, **Retry recording** rewrites the same snapshot and episode ID without recollection or duplicates. Collection failure stays incomplete; retry retains the original interval, records a fresh snapshot time, and preserves previous raw snapshots. A successful empty query clears the pending recording only after its discard checkpoint succeeds, without writing an episode or labelling it a zero-card training example. Completion notifications appear only after the final checkpoint succeeds.

Capture regression coverage includes real SQLite fixtures with live WAL writes, open drafts saved during recording, exclusion of the next blank draft, half-open creation/save boundaries, old cards edited during recording, winning/losing revisions, deletions, trash, archived cards, null template references, fields/templates/attachments, schema and busy errors; durable baseline reloads, automatic Stop/switch completion, empty discards, lifecycle notifications, duplicate clicks, partial writes and completion-checkpoint failures; accepted attempt/branch evidence, credential redaction, truncation, and UI switching and completion after question deletion. Run:

```bash
npm run test -- apps/obsidian/src/inbox apps/obsidian/src/settings
```

On Node 22.12, SQLite is still behind a flag; use `NODE_OPTIONS=--experimental-sqlite` for these tests. Without a SQLite binding, SQLite integration tests are explicitly skipped; mock/UI/recovery tests still run. The installed Obsidian runtime does not require this flag.
