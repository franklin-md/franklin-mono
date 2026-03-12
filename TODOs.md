# TODOs — Deferred Work

## `managed-agent`

- [ ] MockedAgent for quick testing of `agent-manager` + (way to get quick agent-manager mock)

### Codex Adapter

- [ ] Extend item kinds beyond `user_message` / `assistant_message` (e.g. tool calls, tool results)
- [ ] Fill in `SessionSpec` / `SessionRef` with real fields
- [ ] Session resume and forking (currently limited by empty `SessionRef`)
- [ ] Richer `PermissionRequest` kinds (currently everything is `generic`)
- [ ] Handle `thread/status/changed`, `turn/steer` notifications
- [ ] Transport stderr logging (currently ignored)
- [ ] Configurable transport timeouts (shutdown, request deadlines)
- [ ] Transport reconnection / restart on crash

### Other Adapters

- [ ] Claude adapter (`packages/adapter-claude` or `src/adapter/claude/`)
