**Memo**

I inspected the `pi-subagents` implementation and its tests, mainly [fork-context.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-subagents/fork-context.ts), [subagent-executor.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-subagents/subagent-executor.ts), [execution.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-subagents/execution.ts), [intercom-bridge.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-subagents/intercom-bridge.ts), [subagent-prompt-runtime.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-subagents/subagent-prompt-runtime.ts), plus the fork/intercom/prompt-runtime tests under `.context/external/pi-subagents/test`.

**Observed semantics**

- `context` defaults to `fresh`; only the literal value `"fork"` changes behavior. This is enforced in `resolveSubagentContext()` and covered by [test/unit/fork-context.test.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-subagents/test/unit/fork-context.test.ts).
- `fresh` does not mean `reuse parent session` or `run without sessions`. The executor still allocates a per-run session root and passes a unique `sessionDir` to each child run. So `fresh` means `clean child session`, not `ephemeral prompt-only call`.
- `fork` means `start each child from a real branch of the parent’s current leaf`. The resolver requires a persisted parent session file and a current leaf id, then opens a throwaway session manager on that file and calls `createBranchedSession(leafId)` once per flat task index. It fails hard if any of that is missing; there is no downgrade to `fresh`. This is locked in by [test/unit/fork-context.test.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-subagents/test/unit/fork-context.test.ts) and [test/integration/fork-context-execution.test.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-subagents/test/integration/fork-context-execution.test.ts).
- Parallel and chain fork semantics are intentionally isolated. Every parallel task and every chain step gets its own branch from the same parent leaf. A later chain step does not continue the earlier step’s forked session; it only receives prior step output through task text plumbing like `{previous}`. This is easy to misread if you hear `forked chain`.
- `fork` also adds a prompt preamble (`DEFAULT_FORK_PREAMBLE`) telling the child to treat inherited history as reference-only and not continue the parent conversation. That is prompt guidance, not state enforcement. Covered by [test/unit/types-fork-preamble.test.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-subagents/test/unit/types-fork-preamble.test.ts).

**Exact host/runtime support this requires**

- A parent-side session manager with Pi-specific methods and semantics:
  `getSessionFile()`, `getLeafId()`, `getSessionId()`, `getEntries()`, and a static-ish `constructor.open(path)` that returns an object with `createBranchedSession(leafId)`.
- A child launcher that can start Pi with either `--session <exact-file>` for fork mode or `--session-dir <dir>` for fresh mode. `pi-subagents` depends on exact-file resume for fork correctness; directory-only persistence is insufficient.
- Persistent session files with branchable leaf structure. This is the biggest mismatch with Franklin. Franklin’s session model is copy-by-state: `runtime.fork()` clones runtime state, and Mini-ACP explicitly frames fork as `new connection + copied context`, not `branch current leaf inside a persisted transcript file` ([packages/extensions/src/systems/sessions/runtime/manager.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/extensions/src/systems/sessions/runtime/manager.ts), [packages/extensions/src/systems/core/runtime.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/extensions/src/systems/core/runtime.ts), [packages/mini-acp/README.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/mini-acp/README.md)). Franklin has no leaf id or branch-from-leaf file primitive today.
- A final-system-prompt rewrite hook. `pi-subagents` always injects a runtime extension and uses env vars to strip inherited project-context and skills sections just before agent start. Without a `before_agent_start` equivalent, the `inheritProjectContext` / `inheritSkills` flags cannot work as implemented.
- A prompt format that matches Pi’s literal section headers. The runtime stripper is string-based, not AST-based.
- Intercom support requires more than a tool name:
  a live broker addressable by session name or fallback alias,
  extension loading for `pi-intercom`,
  an event bus for detach request/response,
  and host tolerance for the child continuing after the initiating foreground tool has already returned.
- Async/background result routing assumes a file watcher plus a stable per-session correlation token. Notably, `state.currentSessionId` is often set to the parent session file path, not the logical session id.

**Fragile semantics**

- Inherited-context stripping is brittle. It searches for exact prompt substrings like `# Project Context`, the skills header, and `Current date:`. Any upstream prompt-template change can silently stop stripping or remove the wrong text. See [subagent-prompt-runtime.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-subagents/subagent-prompt-runtime.ts) and [test/unit/subagent-prompt-runtime.test.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-subagents/test/unit/subagent-prompt-runtime.test.ts).
- `inheritProjectContext` and `inheritSkills` only affect prompt text. They do not reduce repo access, tools, cwd, or other runtime capabilities.
- Explicitly injected skills survive `inheritSkills: false`. That is deliberate, but it means `no inherited skills` is not the same as `no skill content`.
- Intercom coordination is now mostly prompt-shaped. The changelog explicitly says runtime policing/retry was removed on 2026-04-20. If the child ignores the instructions and replies inline, the runtime does not force correction.
- Foreground intercom detach is triggered by a string marker in the system prompt (`"Intercom orchestration channel:"`) plus actual `intercom` tool start. That is a heuristic contract, not a typed capability check.
- Intercom activation is also heuristic-heavy: it depends on filesystem presence of `~/.pi/agent/extensions/pi-intercom`, a config file that defaults to enabled and even treats malformed JSON as enabled, and path-string matching for extension allowlists.
- The result watcher’s `sessionId` field is semantically overloaded. For async runs it may actually be the parent session file path or a synthetic fallback token, so any host adapter has to preserve that odd convention or reroute results differently.
- Exact `fork` semantics are unavailable in Franklin without either:
  implementing Pi-like persisted leaf branching, or
  intentionally weakening `fork` to `copy current runtime state into a new Franklin session`.

This memo is from source-and-test inspection; I did not execute the test suite.

