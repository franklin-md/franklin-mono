# PI-Subagents Transpiler Assessment

This is a detailed synthesis of the independent reports in this folder, plus coordinator inspection of the cloned repository at [`.context/external/pi-subagents`](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-subagents).

## Executive Verdict

`pi-subagents` is not a good “simple proof” target for a generic PI-extension transpiler. It is a stress test.

If the question is:
- `Can Franklin host a useful semantic port of pi-subagents?` — yes.
- `Can a generic transpiler get pi-subagents into working order without major Franklin substrate work?` — not really.

The realistic path is:
1. semantic port first
2. generic transpiler compatibility second

The reason is simple: `pi-subagents` depends on four layers at once:
- Pi extension registration
- Pi command/UI shell
- Pi session/persistence semantics
- Pi child CLI/runtime contract

The syntax translation part is the easy part.

## Repository Size And Shape

At the cloned commit `aba3820f23e24d5a3f1b12f20feae03329f2ffc4` (`v0.17.1`), the repo has:
- 54 root TypeScript files
- 7 builtin agent markdown files
- 47 test files

The heavy files are:
- `chain-clarify.ts` — 1362 LOC
- `subagent-executor.ts` — 1334 LOC
- `subagent-runner.ts` — 1228 LOC
- `agents.ts` — 759 LOC
- `chain-execution.ts` — 705 LOC
- `worktree.ts` — 568 LOC
- `execution.ts` — 564 LOC
- `render.ts` — 512 LOC
- `slash-commands.ts` — 487 LOC
- `async-execution.ts` — 436 LOC

That already tells you this is not “one Pi tool plus a few hooks”. It is an orchestration framework with a Pi-facing shell.

## What PI-Subagents Actually Uses

From [01-surface-and-dependencies.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/reassess-pi-subagents-transpiler-2026-04-20/reports/01-surface-and-dependencies.md), the core dependency set is:

- Pi registration APIs:
  - `registerTool`
  - `registerCommand`
  - `registerShortcut`
  - `registerMessageRenderer`
  - `sendMessage`
- Pi lifecycle hooks:
  - `tool_result`
  - `session_start`
  - `session_shutdown`
  - `before_agent_start`
- Pi UI:
  - `ctx.ui.custom`
  - `notify`
  - `setStatus`
  - `onTerminalInput`
  - `setWidget`
  - `theme`
  - direct `pi-tui` components
- Pi runtime/session/model context:
  - `ctx.cwd`
  - `ctx.hasUI`
  - `ctx.model.provider`
  - `ctx.modelRegistry.getAvailable()`
  - `ctx.sessionManager.getSessionFile()`
  - `ctx.sessionManager.getEntries()`
  - `ctx.sessionManager.getSessionId()`
  - `ctx.sessionManager.getLeafId()`
  - `sessionManager.constructor.open(...).createBranchedSession(...)`
- Pi child CLI/runtime contract:
  - `--mode json -p`
  - `--session`, `--session-dir`, `--no-session`
  - `--model`, `--tools`
  - `--no-extensions`, `--extension`
  - `--no-skills`
  - `--system-prompt`, `--append-system-prompt`
  - JSON events like `tool_execution_start`, `tool_execution_end`, `message_end`, `tool_result_end`

This is why a generic transpiler is insufficient by itself. `pi-subagents` is coupled to the host shell and the child runtime contract, not just the extension hook names.

## What Maps Directly To Franklin

From [04-franklin-compatibility.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/reassess-pi-subagents-transpiler-2026-04-20/reports/04-franklin-compatibility.md):

These parts are already conceptually aligned:
- child/fork delegation as a runtime concept
- externalized tool execution
- filesystem/bash/web/todo/status overlap
- environment-localized execution with cwd/network controls

That means Franklin already has enough substrate to support:
- agent profile loading
- session-based subagent runs
- sequential and parallel orchestration
- artifact/file handoff patterns
- model override and environment override

So a useful Franklin-native `subagents` feature is not blocked on fundamentals.

## What Needs Shims, Not New Protocol

These parts are better understood as app-side compatibility shims:
- agent markdown/frontmatter parsing and override precedence
- `/run`, `/chain`, `/parallel` orchestration semantics
- chain directories, `progress.md`, output/read file conventions
- async run history and status persistence
- AGENTS/CLAUDE instruction inheritance compatibility

These are substantial, but they do not require Mini-ACP redesign.

This is the core reason I would recommend a semantic port rather than waiting for a perfect transpiler. Most of the useful behavior lives here.

## What Requires New Franklin Work

These are the real platform gaps.

### 1. Per-session tool and extension filtering

This is the biggest one.

`pi-subagents` agents carry their own:
- `tools`
- `extensions`
- MCP direct-tool selection

Franklin currently injects one static extension/tool universe per session manager. Near-full parity needs a first-class way to say:
- this child gets only these builtin tools
- plus these app extensions
- plus these direct MCP tools

Without that, a port can work, but every child inherits a broader tool surface than Pi intended.

### 2. Usage / cost / model-attempt telemetry

`pi-subagents` has serious observability. Franklin’s Mini-ACP explicitly still lacks usage in `TurnEnd`.

If you want parity in:
- tokens
- cost
- model attempts / retries
- compact status rendering

then Mini-ACP needs a protocol expansion or a side-channel.

### 3. Exact fork semantics

This is the nastiest semantic mismatch.

From [03-fork-session-intercom.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/reassess-pi-subagents-transpiler-2026-04-20/reports/03-fork-session-intercom.md):
- Pi `fresh` means clean child session with its own session dir.
- Pi `fork` means a real branch from the parent’s current leaf in a persisted session file.
- Each parallel task and each chain step gets an isolated branch from the same parent leaf.

Franklin’s `session.fork()` is closer to copy-state than `branch current persisted leaf`.

So you have a hard choice:
- add Pi-like persisted-leaf branching to Franklin
- or deliberately weaken `fork` semantics in the port and document the difference

For a first useful port, I would weaken it.

### 4. Prompt rewrite timing

`pi-subagents` depends on a child extension running `before_agent_start` to strip inherited project-context and skills sections from the final system prompt.

Franklin can assemble system prompts, but exact parity wants:
- a final pre-agent-start rewrite seam
- or a stronger internal prompt AST/composition model

Without that, `inheritProjectContext` and `inheritSkills` become approximate rather than exact.

### 5. Command / renderer / TUI shell parity

For full parity, Franklin also still lacks:
- a compile-time command API
- message renderer registration
- portable widget/overlay APIs
- raw terminal input hooks

These are not necessary for the core orchestration port.
They are necessary for the Pi-shaped product shell.

## The Real Architecture Of PI-Subagents

From [02-runtime-architecture.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/reassess-pi-subagents-transpiler-2026-04-20/reports/02-runtime-architecture.md), the critical observation is:

`pi-subagents` has two execution planes:
- foreground, callback-driven, in-process orchestration
- async/background, detached runner plus filesystem status/results

And it has two shell planes:
- tool-driven execution path
- slash-command/UI path

That means parity is not one thing. It is really four targets:
- core execution semantics
- background semantics
- fork/session semantics
- shell/UI semantics

This is why effort jumps sharply from “useful” to “parity”.

## First Useful Port vs Near-Parity Port

### First useful Franklin port

Recommended scope:
- agent discovery and frontmatter parsing
- single-run subagent execution
- simple sequential chain
- simple top-level parallel
- artifact directories
- output/read conventions
- model overrides
- cwd/environment overrides
- Franklin-native `fresh` and weakened `fork`

Explicitly defer:
- slash commands
- chain clarify UI
- agent manager UI
- background execution
- result widgets and custom rendered result cards
- intercom detach semantics
- worktree hooks and patch/diff reporting
- prompt-template bridge

Expected difficulty:
- medium-high
- roughly `2-3 weeks` for one engineer is plausible

### Near-parity Franklin port

Adds:
- background jobs
- result watching/status panels
- worktree isolation
- agent CRUD and manager UI
- Pi-like fork semantics
- stronger observability
- per-session tool/extension scoping
- command/shortcut shell
- message rendering and widgets

Expected difficulty:
- high
- roughly `4-6 weeks` is plausible if Franklin APIs settle
- more if Franklin substrate changes in-flight

## Risk Ranking

From [05-risk-effort.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/reassess-pi-subagents-transpiler-2026-04-20/reports/05-risk-effort.md), the main risks are:

1. Orchestration semantics are the hard part, not syntax translation.
2. Franklin’s target abstractions are still moving.
3. Worktree and fork behavior are dense and regression-prone.
4. Full parity crosses a Pi-TUI/runtime boundary.
5. Agent-definition compatibility is a real subsystem, not a detail.
6. Rendering/slash UX is large but deferrable.

I agree with that ordering.

## Strong Recommendation

If your goal is “get the transpiler into working order with `pi-subagents`,” do not make `pi-subagents` the first target of a generic transpiler.

Do this instead:

1. Build a Franklin-native `subagents` semantic port with reduced scope.
2. Use that port to identify the real reusable compatibility substrate:
   - agent profile compatibility
   - prompt inheritance compatibility
   - child session orchestration compatibility
   - per-session tool filtering
   - usage telemetry
3. Only then teach a generic transpiler to target that substrate.

Why:
- `pi-subagents` is too Pi-shell-specific to be a clean first transpiler milestone.
- But it is an excellent design benchmark for what Franklin eventually needs.

## Bottom Line

Can you get a useful `pi-subagents`-like capability working on Franklin? Yes.

Can you get the literal Pi extension “working order” via transpiler alone? No, not without adding at least:
- command support
- per-session tool/extension scoping
- stronger prompt-rewrite support
- some answer to fork semantics
- better usage telemetry

So the honest answer is:
- `MVP compatible port`: feasible now, medium-high effort
- `Generic transpiler success case`: not yet
- `Near-parity Pi extension port`: feasible, but only after Franklin grows a few targeted platform features

