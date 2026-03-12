# TODOs — Deferred Work

## `managed-agent`

- [x] MockedAgent for quick testing of `agent-manager` + (way to get quick agent-manager mock)

### Codex Adapter

- [ ] Extend item kinds beyond `user_message` / `assistant_message` (e.g. tool calls, tool results)
- [ ] Fill in `SessionSpec` / `SessionRef` with real fields
- [ ] Session resume and forking (currently limited by empty `SessionRef`)
- [ ] Add Codex protocol version detection / compatibility handling so generated transport types can track CLI/app-server changes safely
- [ ] Richer `PermissionRequest` kinds (currently everything is `generic`)
- [ ] Handle `thread/status/changed`, `turn/steer` notifications
- [ ] Transport stderr logging (currently ignored)
- [ ] Configurable transport timeouts (shutdown, request deadlines)
- [ ] Transport reconnection / restart on crash

### Other Adapters

- [ ] Claude adapter (`packages/adapter-claude` or `src/adapter/claude/`)

## Packaging / Publishing

- [ ] Before publishing any package to npm: evaluate whether to strip `sourceMap` / `inlineSources` from `tsconfig.base.json` (or override per package) to avoid shipping source content in dist artifacts
