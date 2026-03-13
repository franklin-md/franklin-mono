# TODOs — Deferred Work

## Packaging / Publishing

- [ ] Before publishing any package to npm: evaluate whether to strip `sourceMap` / `inlineSources` from `tsconfig.base.json` (or override per package) to avoid shipping source content in dist artifacts

## Architecture v3

- [ ] Specify agent lifecycle and failure semantics: startup failure, mid-turn process crash, transport disconnect, cancellation, and disposal behavior
- [ ] Define how lifecycle failures surface through `AgentHandle` status changes and emitted events
- [ ] Decide whether middleware needs explicit error/lifecycle hooks beyond `wrapAgent()` / `wrapClient()`
- [ ] Clarify middleware composition order in docs with an explicit onion model for `wrapAgent()` / `wrapClient()`
- [ ] Specify resume modes: history replay only vs live ACP session restore, including capability-gating around `session/load`
- [ ] Define the boundary between raw ACP `SessionUpdate` events and Franklin-normalized `AgentEvent` history
- [ ] Document whether history stores the original app prompt, the module-expanded prompt, or both
- [ ] Clarify the `onPrompt()` contract: prepend, append, replace, and any invariants modules must preserve
- [ ] Decide whether permission policy is intentionally inbound-only or if Franklin also needs outbound guard middleware for app-level blocking (rate limits, quotas, etc.)
- [ ] Document how `defineAppTools()` hosts MCP tools: transport model, process ownership, and lifecycle management
- [ ] Add a Phase 1 integration test that proves spawn -> prompt -> streamed output works against a real ACP agent
