This is a partial transcript of a conversation between a user and an AI assistant. Intermediate AI messages have been elided.

## User

Read .context and read pi-mono's extensions API (and ctx API). Compare the parts of the api that are missing. Then maybe find some common pi extensions online (popular ones)

Then tell me how much of their API I am funcitonally missing. I want to know how hard it would be to create a "Transpiler from PIExtension"

## Assistant

## Summary

### API coverage: Franklin vs Pi

I read `.context/algebra/06-pi-mono-and-community-comparison.md`, pi's `types.ts` (`ExtensionAPI` + `ExtensionContext`), Franklin's `CoreAPI`/`StoreAPI`/`SessionAPI`/`EnvironmentAPI`, and surveyed all 68 example extensions in `/tmp/pi-mono/.../examples/extensions/`.

**Pi's surface** (what extensions actually touch):
- `pi.on(...)` — 23 event types (session/agent/turn/message/tool/model/input/user_bash/resources)
- `pi.registerTool` / `registerCommand` / `registerShortcut` / `registerFlag` / `registerMessageRenderer` / `registerProvider`
- `pi.sendMessage` / `sendUserMessage` / `appendEntry` / `setSessionName` / `setLabel` / `exec` / `setModel` / `setThinkingLevel` / `setActiveTools`
- `ctx.ui.*` (notify, confirm, select, custom, setStatus, setWidget, setFooter/Header/Title, setEditorComponent, setTheme, editor, input, setEditorText, setHiddenThinkingLabel) — ~18 methods
- `ctx.sessionManager`, `ctx.modelRegistry`, `ctx.model`, `ctx.cwd`, `ctx.compact`, `ctx.getSystemPrompt`, `ctx.abort`, `ctx.shutdown`, `ctx.hasUI`, `ctx.isIdle`, `ctx.newSession`/`fork`/`navigateTree`/`switchSession`/`reload`

**Franklin's surface today:**
- `on`: prompt, cancel, systemPrompt, chunk, update, turnEnd, toolCall, toolResult (8 events)
- `registerTool`, `registerStore`
- `SessionAPI`: child / fork / remove
- `EnvironmentAPI`: essentially empty today
- No UI, no commands, no shortcuts, no flags, no provider/model mutation, no message renderers, no appendEntry, no session-lifecycle events, no input/user_bash, no compaction, no resource discovery

### Functional coverage estimate

At the API-symbol level Franklin covers roughly **20-25%** of pi's extension surface. By extension-compatibility:

| Category | Count | What's needed |
|---|---|---|
| **Transpiles today** | ~15 / 68 (22%) | Only touches `toolCall`/`toolResult`/`systemPrompt`/`prompt` + `registerTool` |
| **Transpilable with a shim** | ~35 / 68 (52%) | Needs a noop UI layer + command/flag/shortcut registry + `session_start`/`session_shutdown` lifecycle + `appendEntry`/`setSessionName`/`setLabel` mapped to `StoreAPI` |
| **Fundamentally incompatible** | ~18 / 68 (26%) | Custom providers, compaction, editor replacement, TUI overlays, plan-mode tool swapping, session-tree navigation, provider payload interception |

### Top blockers for a PIExtension transpiler (ranked by extension-count)

1. `ctx.ui.notify` — 35 extensions (trivial: noop)
2. `pi.registerCommand` — 29 (no Franklin analogue — needs a Command/Input family)
3. `pi.on('session_start')` — 18 (no Franklin equivalent lifecycle event)
4. `ctx.ui.custom` (TUI overlay) — 14 (deep Pi-TUI dependency, essentially unmappable)
5. `ctx.sessionManager.getBranch/getEntries` — 12 (no history read API)
6. `ctx.ui.setStatus` / `confirm` / `select` / `input` — ~20 combined (need a UI shim, most can noop)
7. `pi.setModel` / `registerProvider` / `before_provider_request` — model/provider family

### How hard is the transpiler?

**Mechanical rewrite** (rename `pi.on('toolCall', …)` style, adapt event payload shapes, map `pi.registerTool` → `api.registerTool`): **small** — maybe 1-2k LOC. Could AST-transform most `.ts` files.

**Runtime shim layer** to satisfy the `ctx`/pi surface at runtime: **medium** — 2-3 weeks. A `StubExtensionContext` with noop UI, a fake slash-command registry (registered commands are ignored or attached as metadata), and `appendEntry`/`setSessionName` routed through `StoreAPI` would unlock another ~30 extensions.

**The hard 26%** cannot be transpiled without genuinely new Franklin API families — matches your memo's 06-pi-mono conclusion exactly: `Input/Command`, `UI`, `Model/Provider`, `History/Compaction` need to exist in Franklin itself before those extensions can run.

**Bottom line:** a transpiler could realistically hit ~75% coverage with a shim-only strategy (no new Franklin primitives). Getting past ~75% requires building out at least `CommandAPI` + `ModelAPI` + `HistoryAPI` first — which is exactly the 4-6 new families memo 06 already identified. So "transpiler hardness" is a direct proxy for "how many of those new families are you willing to add."

## User

I want you to do the following:
1) Subagent to investiate CommandAPI. Could we reuse any of their CommandMAnager code? (if thats what its called?)
2 For UI, some TUI we cannot do but UI that is INTERACTION based could definitiely
3) I feel that at some point, session lifecycles could be implemented using registration api on Session?
4) History API/RUntime. Does that make sense? SUrely some of the concerns (like compaction) shouldnt be part of History but should be built on top?

Thoughts? Plan out in chat your investigation decomposition into agent

## Assistant

Here's how I'd decompose this into 4 parallel investigations. Each produces a short architectural memo, not code.

### Agent 1 — **CommandManager reuse investigation**
**Question:** Is pi's command subsystem (slash commands + shortcuts + flags) a clean, lift-outable unit, or is it wedged into the TUI?

**What it will do:**
- Read pi's slash-commands module, keybindings manager, flag registration, and how the loader wires them through `ExtensionAPI.registerCommand/Shortcut/Flag`
- Identify the *pure* pieces (command registry, name resolution, autocomplete) vs TUI-coupled pieces (key dispatch in terminal raw mode, overlay rendering)
- Estimate: if we lift the registry + resolution as a package, what interfaces need to be abstracted?
- Propose a Franklin `CommandAPI` shape that mirrors pi semantics but is UI-agnostic (command is just a named effect + async handler + argument-completion callback; who invokes it is the harness's problem)

### Agent 2 — **Interaction-UI vs Presentation-UI split**
**Question:** Of pi's `ctx.ui.*` surface, which methods are *interactions* (question/answer primitives that are protocol-level, not rendering-level) vs *presentation* (layout, widgets, theme — TUI-bound)?

**What it will do:**
- Classify all ~18 `ctx.ui.*` methods into 3 buckets: **interaction** (`confirm`, `select`, `input`, `editor`, `notify`), **presentation** (`setStatus`, `setWidget`, `setFooter`, `setHeader`, `setTitle`, `setTheme`, `setEditorText`), **TUI-only** (`custom`, `setEditorComponent`, `onTerminalInput`)
- Check whether the interaction subset maps onto mini-ACP's existing `permission` request/response channel or would need a new `prompt_user` client-side RPC
- Sample the extensions that use interaction UI (confirm-destructive, qna, question, questionnaire, timed-confirm, handoff, bookmark) and verify they work through a protocol-level Q&A primitive without TUI
- Rough sizing for a `InteractionAPI` / `PromptAPI` in Franklin (probably just `ask(schema) → Promise<value>` + `notify(level, message)`)

### Agent 3 — **Session-lifecycle as SessionAPI registration**
**Question:** Do `session_start`, `session_before_fork`, `session_before_switch`, `session_shutdown`, `session_before_compact`, `session_tree`, etc. deserve their own family, or are they just `SessionAPI.on('lifecycle', handler)` hooks?

**What it will do:**
- Read Franklin's `SessionSystem` — how does `child`/`fork`/`remove` work today? Where does registration live?
- Test the hypothesis: can `SessionAPI` gain `.on('start'|'shutdown'|'beforeFork'|'beforeSwitch', handler)` the same way `CoreAPI.on('prompt', ...)` works, without introducing a new family?
- What are the cancellation-semantics concerns (pi's "before_X" events can cancel; Franklin's current `on` handlers don't return cancellation signals — does this need a `before` variant of the registrar, which memo 07 "insights" may already discuss)?
- Recommendation: fold vs split

### Agent 4 — **History primitive vs Compaction-as-composition**
**Question:** What's the minimum *primitive* below compaction? If compaction is an extension, what API does it need?

**What it will do:**
- Read pi's compaction module (`SessionBeforeCompactEvent`, `CompactionPreparation`, `CompactionResult`) and see what operations it does: read message log, produce summary, replace prefix with summary entry
- Identify the minimum primitives: (a) read session-entry log, (b) write a synthetic/branch-summary entry, (c) reset/rewrite message-history used for next LLM call
- Check your memo on composition-over-embedding — this is exactly the "symptom of 29 events" case. Proposal: `HistoryAPI` = just the read/write primitives on session entries; compaction, tree-navigation, bookmarks, summarization are *extensions* composed on top
- Verify against pi's `bookmark.ts`, `custom-compaction.ts`, `summarize.ts`, `handoff.ts` — could all four be expressed over `HistoryAPI.{getEntries, appendEntry, label, rewriteBranch}` alone?
- Recommendation: name the 3-4 primitive operations, and list which pi "subsystems" collapse into compositions

### Parallelism
All four are independent — I'll launch them together. Each returns ≤600 words. Then I'll synthesize a single decision matrix: "for each family, fold-or-split, reuse-pi-code-or-rebuild, and which extensions it unlocks."

**Confirm and I'll fire them off.**

## User

Go ahead

## Assistant

All four agents done. Synthesis below.

## Decision matrix

| Family | Fold or Split? | Reuse pi code? | New primitive needed? | Extension coverage unlocked |
|---|---|---|---|---|
| **CommandAPI** | **New family** (thin) | **Rebuild** — pi's 150 LOC of pure logic drags `pi-tui`/`KeyId`/`AutocompleteItem` types; rewrite against `CoreRuntime` is shorter than import-rewiring | `CommandRegistrar` mirror of `CoreRegistrar`; harness owns invocation | **~29 extensions** (`registerCommand` users) |
| **InteractionAPI** | **New family** (protocol-level) | New reverse-RPC `userPrompt`/`userNotify` on mini-ACP, mirroring `toolExecute` at `packages/mini-acp/src/base/types.ts` | 5 methods: `confirm/select/input/editor/notify`; `null` = cancelled | **~63% of UI-touching** (~22 extensions) alone, ~83% with 3-method string-slot Presentation add-on |
| **SessionAPI lifecycle** | **Fold** 4 events; drop 2 (tree); route 2 to History | Copy `CoreRegistrar` pattern (~20 LOC) into sessions system | **New composer: `firstVeto`** alongside `waterfall`/`fanout` for cancellable "before" hooks | ~18 `session_start` + several shutdown/fork/switch users |
| **HistoryAPI** | **Fold into `SessionAPI`** — not a new family | Extend `SessionRuntime` with 5 ops: `entries/head/append/label/lookup`; parametrize `session.child({ fromEntry })` | Append-only log with `supersedes?: [from,to]` marker; labels co-located with log (not `StoreAPI`) | All compaction/bookmarks/summarize/handoff become compositions |

## Headline findings

1. **The registrar pattern is structurally Core-scoped, not semantically Core-scoped.** It copies cleanly to Session and Command with ~20 LOC each. Your existing algebra already supports this — it's the "per-system compilers as primitive" move from memo 07.

2. **One genuinely new composition primitive required: `firstVeto`.** Franklin today has `waterfall` (transform) and `fanout` (observe). Cancellable "before" hooks (`beforeFork`, `beforeSwitch`, plus a bunch of pi's tool-call blockers) need short-circuit semantics. This is a structural addition to the algebra, not just a bigger bag of hooks.

3. **Pi's `session_before_compact` is mislabelled as lifecycle — it's "provide an implementation".** That's `DependencyAPI<'Compactor', Compactor>` shape, which your `project_composition_over_embedding.md` memo already predicts. Compaction then reduces to: a `Compactor` dependency + `HistoryAPI` log access + `append({ supersedes })`. No compaction primitive in the runtime.

4. **`HistoryAPI` is an extension of `SessionRuntime`, not a new family.** The log is per-session, mutably appended during a turn, COW on fork — exactly the lifecycle `SessionCollection` already manages. Labels must live with the log (invariant: `label → id` must stay valid under fork).

5. **Agent 2's mini-ACP fit is the subtlest win.** Asking the user a question is architecturally identical to asking the client to execute a tool — both are reverse-RPC. Adding `userPrompt` as a sibling of `toolExecute` keeps Franklin's "no UI" invariant, and unlocks ~63% of UI extensions on day one. Any harness (CLI `--yes`, web modal, test rig) implements it differently.

## What a transpiler looks like after these changes

Coverage if you land **all four**:
- CommandAPI → ~29 extensions
- InteractionAPI (Interaction-only) → ~22 UI extensions
- SessionAPI lifecycle fold → ~18 `session_start` users and ~10 others
- HistoryAPI on SessionRuntime → unlocks `bookmark`, `handoff`, `summarize`, `custom-compaction`, and ~10 `sessionManager.getEntries` users

Combined, the transpiler goes from **~22% → ~75-80%** with these four changes, no new sub-runtime, no TUI dependency, no provider/model-mutation family yet. The remaining ~20% (custom-provider-*, editor replacement, TUI games, `plan-mode` tool-swapping, `before_provider_request`) is the "fundamentally incompatible" bucket from the original survey — those need `ModelAPI` + tool-set manipulation + renderer, which are genuinely more involved.

## Suggested build sequence

1. **`firstVeto` composer** — smallest, unblocks #2/#3. Pure algebra addition.
2. **SessionAPI lifecycle fold** — copy-paste the registrar pattern, prove it for `start/shutdown`, then add `beforeFork/beforeSwitch` using `firstVeto`.
3. **HistoryAPI on SessionRuntime** — extend `session.runtime` with the 5 log ops + `fromEntry` parameter on `child`.
4. **CommandAPI** — new system, same shape as Core, harness-agnostic.
5. **InteractionAPI** — the only one touching the wire protocol (new reverse-RPC). Do last because it crosses the mini-ACP boundary.

Steps 1-3 are internal to `@franklin/extensions`; step 4 adds a new system; step 5 modifies the mini-ACP manifest. So the bulk of the work stays in one package.

Want me to save any of this to memory (e.g. the `firstVeto` insight, the "compaction is a Dependency not a lifecycle" finding, or the HistoryAPI-folds-into-Session verdict)?