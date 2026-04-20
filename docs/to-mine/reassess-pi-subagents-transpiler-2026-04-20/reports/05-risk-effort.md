**Memo**

Overall assessment: a first Franklin-compatible port is feasible at medium-high effort, but near-parity is high risk. I would estimate roughly 2 to 3 weeks for a useful first port and 4 to 6 weeks for parity, assuming one engineer and no major Franklin API churn during implementation.

The evidence is asymmetrical. `pi-subagents` is a large, behavior-dense extension with 27 unit, 17 integration, and 3 e2e test files, and its hottest files over the last 120 days were `subagent-runner.ts`, `execution.ts`, `async-execution.ts`, `render.ts`, `chain-execution.ts`, `agents.ts`, and `subagent-executor.ts`. Franklin, by contrast, has the right primitives in `mini-acp`, `extensions`, and `agent`, but its recent history shows active movement in the target abstractions themselves: extension taxonomy reorg, prompt/system-prompt changes, session/state collision guards, `setContext` merge semantics, and persistence/platform refactors all landed between April 16 and April 20, 2026.

**Severity-ranked blockers and risks**

1. `Critical`: the hardest gap is orchestration semantics, not syntax translation. Franklin’s built-in `spawnExtension()` is intentionally simple, while `pi-subagents`’ real behavior is spread across `subagent-executor.ts` (1335 LOC), `subagent-runner.ts` (1229 LOC), `execution.ts` (565 LOC), `async-execution.ts` (437 LOC), and `chain-execution.ts` (706 LOC). That code is where mode selection, retries, session directories, artifacts, live updates, worktree handling, and failure semantics actually live.

2. `High`: the Franklin target surface is still moving. Recent Franklin commits changed prompt composition, extension organization, session/runtime composition, and persistence. Porting onto abstractions that are settling increases rework risk, especially for anything that depends on `systemPrompt`, session derivation, or environment lifecycle.

3. `High`: worktree and fork behavior are dense and easy to regress. `worktree.ts` alone has 18 passing unit tests covering clean-repo requirements, hook execution, synthetic path filtering, patch generation, and cleanup. `fork-context.ts` depends on persisted-session branching semantics that do not map 1:1 to Franklin’s current session API. This is a real compatibility risk, not just plumbing.

4. `High`: `pi-subagents` is strongly coupled to Pi-specific UI/runtime assumptions. `chain-clarify.ts` is the single largest file and imports `@mariozechner/pi-tui`; in this workspace, the selected `chain-execution` and `fork-context-execution` suites could not run because that dependency is absent. That is a useful signal: full chain/fork parity currently crosses a UI/runtime boundary, not just an execution boundary.

5. `Medium-High`: agent-definition compatibility is substantial on its own. `agents.ts` plus `skills.ts`, `model-fallback.ts`, `subagent-prompt-runtime.ts`, and `agent-management.ts` encode markdown frontmatter, builtin override precedence, skill discovery, provider-aware model resolution, prompt inheritance stripping, and CRUD semantics. Franklin has instruction loading and prompt hooks, but not this compatibility layer yet.

6. `Medium`: rendering and slash UX are dense but separable. `render.ts`, `slash-commands.ts`, `slash-live-state.ts`, `agent-manager.ts`, and status overlays add real product value, but they are not the right first target for a Franklin port.

**Rough implementation phases**

1. Compatibility kernel, about 4 to 6 days. Implement agent-file loading, frontmatter parsing, prompt inheritance rewriting, model fallback resolution, and a sync single-subagent execution path on top of Franklin sessions and Mini-ACP. This is the minimum that proves the port is real.

2. Structured orchestration, about 4 to 7 days. Add Franklin-native sequential chain and top-level parallel execution, result aggregation, shared artifact/session layout, and failure propagation. Keep this foreground-only at first.

3. Isolation and resilience, about 4 to 6 days. Add worktree support, environment reconfiguration, cleanup semantics, and only then revisit forked-session behavior. This is where the git and persistence edge cases live.

4. UX parity, about 5 to 10 days. Add slash commands, live status widgets, clarify UI, agent manager flows, and background execution. This phase is deferrable and should not block a first useful port.

**What I would explicitly defer in a first Franklin-compatible port**

- `chain-clarify.ts` and all `pi-tui` overlay flows.
- `slash-commands.ts`, `slash-live-state.ts`, and rich result cards/widgets.
- `agent-management.ts` and the `/agents` editor/manager surface.
- `async-execution.ts` and `subagent-runner.ts` background mode.
- `intercom-bridge.ts` and fork-only coordination semantics.
- Worktree setup hooks, synthetic-path filtering, and patch/diff artifact reporting.
- Prompt-template and slash bridge integrations that are Pi-specific rather than core subagent behavior.

If the goal is a practical first port, I would target: agent discovery, prompt/runtime compatibility, sync single-run subagents, and a simple chain/parallel layer without UI, async, or worktree features. That is the lowest-risk slice that matches Franklin’s current strengths.

Verification note: I inspected repo structure, recent commit history, and targeted tests. Franklin tests passed for `mini-acp` integration, session management, instruction walk-up, and conversation tracking. Selected `pi-subagents` suites passed for single execution, parallel execution, worktrees, prompt runtime, and model fallback; `chain` and `fork-context` suites were blocked here by a missing `@mariozechner/pi-tui` dependency.

