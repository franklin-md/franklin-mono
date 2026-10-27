# Flashcard training capture: implementation handoff

Updated: 2026-10-23. Status: implemented in the personal inbox build; see [usage, evidence and recovery](inbox-prototype.md#flashcard-training-capture). Capture version 4 simplifies completion: Stop or Record on another answer automatically saves nonempty recordings and discards empty ones, with Obsidian notifications. Version 3 corrected Mochi's precreated-draft behavior discovered in the first real recording.

## Purpose and user intent

The user asks questions through Franklin's Obsidian study inbox, receives an agent-researched answer, then writes selected flashcards directly in Mochi. AI-generated cards tend to cover too much of the answer rather than the few concepts the user actually wants to retain. Collect examples of that selection decision and the user's card formulation, without requiring duplicate entry in Obsidian.

One example is a learning episode: original question + available learning/research context + AI answer -> the user's chosen card set. It can concern several facts; do not assume one question equals one atomic fact or one card. Surrounding notes and previously resolved questions can explain the user's focus. Card formatting is secondary to selecting the right learning targets.

The user explicitly narrowed scope to **newly authored Mochi cards only**. Do not implement tracking of edits to previously saved cards. Include an unsaved draft already open at Record when it is saved during the recording: Mochi creates empty documents ahead of authoring. Capture current content at collection time, including refinements made before Stop.

This handoff is for the existing personal inbox build, not a new app or another flashcard editor. Implement capture only; no training, Mochi writes, scheduled card generation, or model deployment is requested.

## Target checkout and existing implementation

Worktree: `/Users/afv/conductor/workspaces/franklin/madrid-v2`.
Branch at handoff: `A-F-V/add-astra-audit-opencode-go`.
The branch name predates the inbox work. The worktree contains substantial uncommitted inbox implementation: preserve it and work here, not in `/Users/afv/git/franklin` (whose main checkout lacks this prototype).

Read `AGENTS.md`, `apps/obsidian/README.md`, and `docs/inbox-prototype.md` first. Useful entry points:

- `apps/obsidian/src/inbox/types.ts`: question IDs, original text, source snapshots, answer, model and parent lineage.
- `inbox/ui/card.tsx`, `inbox/ui/actions.tsx`: existing question/action UI (paths relative to `apps/obsidian/src/`).
- `inbox/actions/`: configurable name/prompt actions; these currently launch agent jobs. A recording toggle is deterministic host behavior, so do not force it into an LLM prompt to perform timestamp/database operations. Reuse the UI/controller patterns where appropriate.
- `inbox/controller/`: state, schema, migration, lineage and persistence coordination.
- `inbox/host/persistence.ts`: existing serialized, temporary-file + atomic-rename persistence.
- `inbox/agent/runtime.ts`, `research.ts`, `run.ts`, `prompt.ts`: runtime and research/context collection.

**Important discovery:** the inbox intentionally does not persist agent transcripts or research tool results. `runtime.ts` uses an in-memory StoreRegistry and disposes each runtime; `research.ts` explicitly states hashes/tool bodies die with it. Ordinary chat conversation storage does not solve this for the inbox. A button clicked after the answer cannot recover discarded searches or file reads.

Add capture of external research inputs/results during future inbox question execution, keyed to question/attempt. Keep this separate from the main inbox document and avoid recording credentials or hidden model reasoning. Retain actual tool-visible file excerpts/search results/fetched material, tool arguments, source paths/URLs, timestamps and relevant prompt/ancestor context. Store bounded data with explicit truncation markers rather than pretending omitted material was captured. Reuse existing core tool observers after inspecting their APIs. Older questions can yield partial examples using saved question/source/answer; mark missing research context explicitly. Do not silently rerun research and label it the original context.

## Current capture flow

1. An answered question has a Record/Stop control in this personal build. Start creates a durable episode ID, pins question/attempt/ancestor identity and context, records UTC epoch milliseconds, and remembers IDs of open drafts (`new? = true`). One active or incomplete recording at a time. Record on another answer first completes the previous one using the same click time as its end and the new start.
2. User creates cards in Mochi normally. No second editor, copy/paste, or card authoring in Franklin.
3. Stop persists the end time, then queries the local Mochi database for saved cards created within `start_ms <= created_at_ms < end_ms`, plus remembered drafts now saved with `start_ms <= updated_at_ms < end_ms`. Exclude still-unsaved drafts, including the next blank document created by Save and New. Never widen this to arbitrary edits of older saved cards.
4. Decode and snapshot matching current, nondeleted/nontrashed cards, including template fields. Save all matching cards automatically; no review/confirmation step. Timestamp correlation is association, not proof of topic or authorship. Do not label version 4 files as user-reviewed.
5. Save nonempty episodes under a configurable dedicated collection folder in the Obsidian vault. A successful empty result clears the pending recording and creates no episode or completion entry. Notifications report Start, completion/card count, and empty results. Error notifications and a retry control preserve failed captures. Suggested folder name: `Flashcard Training Examples`; exact location is not settled. The earlier request mentioned the Zero to Not Zero folder for design notes; it did not establish a mandatory dataset path.

Agreed storage layout, updated after implementation:

```text
<collection-folder>/<episode-id>.json
```

Each episode is one JSON file containing `captureVersion: 4`, question/attempt IDs, UTC recording window, draft baseline/provenance, automatic completion time/mode, context, research records, captured cards, and unfiltered snapshot history. Increment the capture version whenever the capturing technique changes; the source comment in `apps/obsidian/src/inbox/capture/version.ts` records this rule. Recovery-journal and evidence schema versions are independent.

Preserve raw evidence separately from the final card set within this file. Include snapshot time, source provenance and missing/truncated context status. Template-based cards may have empty `content`; capture `fields` and enough template information to interpret them. Retain attachment references and mark unavailable assets rather than silently losing meaning.

Persist active recording and recover after reload. Stop/retry must be idempotent and preserve the original window. Failed query/save stays visibly incomplete. Never interpret failure as an empty recording. A successful empty query is discarded, not saved as a zero-card preference. A failed completion must not be overwritten by a new recording; retry the preserved snapshot/window first. A retry may collect later-saved content, so record its actual snapshot time. Completed episodes should survive deletion of the inbox question.

## Verified local Mochi access

Database: `~/Library/Application Support/mochi/mochi.db` on this Mac.
Mochi uses SQLite with PouchDB-style document revisions and Transit-encoded JSON. Live document body = join `document-store.winningseq` to `by-sequence.seq`, excluding tombstones. Card creation time is currently at JSON path `$."transit-data"."~:created-at"."~#dt"`: integer Unix milliseconds.

On 2026-10-22 a read-only Python SQLite connection (`mode=ro`, `PRAGMA query_only=ON`) inspected 4,501 current card documents, all with this timestamp encoding. A time-window query for 2026-10-22 00:00 to 2026-10-23 00:00 Europe/London returned six cards; none was trashed. SQL results matched the existing Transit decoder. These are historical verification results, not fixed expected counts.

Original creation-only query shape (bind integer millisecond parameters; version 3 additionally queries the pinned draft IDs and checks their saved update timestamps):

```sql
SELECT b.json
FROM "document-store" AS d
JOIN "by-sequence" AS b ON d.winningseq = b.seq
WHERE b.deleted = 0
  AND json_extract(b.json, '$.type') = 'card'
  AND json_extract(b.json, '$."transit-data"."~:created-at"."~#dt"') >= ?
  AND json_extract(b.json, '$."transit-data"."~:created-at"."~#dt"') < ?;
```

Decode the returned documents and exclude `trashed?` cards. Archived status is not the same as deleted; do not silently exclude authored cards merely because archived. Existing helper: `/Users/afv/Obsidian/Agents/scripts/mochi_cache.py`, especially `decode_transit()` and its current-revision query. Reuse its format knowledge, not its default archived filtering uncritically.

**Do not copy its live-file snapshot technique:** it copies DB/WAL/SHM separately, which is not an atomic snapshot. Prefer a short read-only transaction against the live SQLite DB, or SQLite's supported backup API to a private temporary database. Respect WAL; do not use `immutable=1` on a changing database or checkpoint/write to Mochi. Query locally through the host integration; choose a SQLite binding compatible with Obsidian's Electron runtime after inspecting existing dependencies. No requirement to bundle Python.

No HTTP API, API key, Pro subscription or cloud round trip is needed for this local query. Only locally committed state is visible. The official HTTP API remains a possible future fallback, not part of this MVP.

Real recording investigation, 2026-10-22: the recording ran 18:59:22.887–19:00:22.160 Europe/London. Intended card `j0ifanj1` had draft creation time 18:57:49.812, but was saved at 19:00:19.149 (`new? = false`). The old query instead selected the next blank draft `QmUDaXSN`, created at 19:00:19.155 (`new? = true`). Both were already committed by Stop, so retrying creation-only matching could not fix it. Version 3 remembers open drafts at Record and excludes unsaved documents. The original revision body was compacted, so earlier draft state cannot be reconstructed with certainty from the current DB alone; any one-off recovery must be labelled as such and preserve the original snapshots.

Retry keeps the original window and actual snapshot time. A preexisting draft's eligibility uses its latest saved update time, so save before Stop or switching recordings. Imported/synced cards, clock changes or unrelated creations can affect timestamp correlation. Validate schema/timestamp types and fail visibly on unsupported versions: this is an internal database format, not a stable supported Mochi API.

Sources: [Mochi SQLite migration](https://mochi.cards/blog/v1-15-0-migrating-local-data-to-sqlite/), [SQLite WAL](https://www.sqlite.org/wal.html), [SQLite online backup](https://www.sqlite.org/backup.html), [Mochi API for comparison](https://mochi.cards/docs/api/).

## Implementation sequence and acceptance checks

1. Inspect existing inbox siblings/helpers and choose the minimal deterministic control/state extension. Preserve current actions and in-flight work.
2. Implement research-evidence capture and explicit completeness for old/new questions.
3. Implement read-only Mochi adapter with a database fixture reproducing current revisions and Transit timestamps.
4. Implement durable Start/Stop/switch/retry, automatic episode files, empty discards and lifecycle notifications.
5. Verify boundary inclusion/exclusion; old cards edited inside the window excluded; new cards return latest content; winning revisions only; trashed cards excluded; template fields retained; missing DB/schema, busy reads, crashes, double clicks and partial saves recover without duplicates.
6. Verify evidence belongs to the accepted question attempt, does not mix retries/ancestor branches, and never contains auth credentials. Preserve existing inbox migration behavior. Run appropriate repository tests/lint/build/format checks and manually verify the installed plugin/save latency when authorized by the implementation task.

## Why collect this; later training options (not implementation scope)

The same records support SFT (`context -> user's card set`) and evaluation. Comparing generated sets with the user's references via an LLM judge gives evaluation scores; optimizing the generating policy against that reward would be RL. Preferred/rejected pairs can support DPO without a separate RL loop. Neither a recording toggle nor a dataset alone is an RL environment. Judge semantic target selection, unwanted extra concepts, correctness and answerability, not exact wording; check judge rankings against user preferences before trusting them.

Retain the context available before card creation separately from target cards/later note edits to prevent leakage. Hold out entire learning episodes or closely related session groups, not individual cards. Start with retrieved examples in the prompt, then compare SFT; training a smaller model is not guaranteed to beat a stronger prompted baseline.

Research snapshot, 2026-10-22: [OpenAI's SFT guide](https://developers.openai.com/api/docs/guides/supervised-fine-tuning) reports general improvements at 50–100 examples; [Google guidance](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tuning/supervised-tuning/prepare-data) suggests starting with 100. Neither establishes a threshold for this personalized selection task. Suggested experiments: 20–30 episodes for retrieved examples; 75–125 total for 50–100 training plus 25 held-out episodes; 200–500 to test broader coverage. These are hypotheses, not guarantees.

At research time, [Together](https://www.together.ai/pricing) listed LoRA SFT for models <=16B at $0.48/million processed tokens with a $4 minimum/job. Assuming three epochs and token packing: 100 episodes at 4k or 20k total tokens each costs the $4 minimum; 500 at 20k costs $14.40; 1,000 at 20k costs $28.80. Training only, USD; excludes validation, inference, judges, retries, taxes and engineering. [Billing details](https://docs.together.ai/docs/fine-tuning/pricing). Dedicated adapter serving may dominate cost: [Together LoRA deployment](https://docs.together.ai/docs/fine-tuning/lora-vs-full). Local [MLX-LM LoRA](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md) is a possible later alternative, subject to hardware/context limits. OpenAI's current SFT guide reports closure to new fine-tuning users and a wind-down; do not base this project on old OpenAI fine-tuning price assumptions. Recheck provider availability/prices before spending.

The immediate success criterion is low-friction, correctly linked evidence: Record, author/save in Mochi, Stop or switch, receive completion notification. No training algorithm choice is required to begin.
