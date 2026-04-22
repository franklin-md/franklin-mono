---
name: debug-obsidian-mode
description: Obsidian desktop addendum for debug-mode. Read debug/debug.md first, then use these live-app notes for Franklin or other Obsidian plugin debugging.
---

# Debug Mode: Obsidian Addendum

Read [debug.md](./debug.md) first. This file is only the Obsidian-specific addendum.

## Live App Workflow

If debugging a live Obsidian desktop plugin, prefer the official `obsidian` CLI
over manual Electron DevTools. It connects to the running app and is suitable
for agent-driven debugging.

Verified useful commands:

```bash
obsidian plugin:reload id=<plugin-id>
obsidian dev:errors clear
obsidian eval code="<javascript>"
obsidian dev:errors
obsidian dev:screenshot path=.claude/obsidian-debug.png
obsidian dev:debug on
obsidian dev:console level=error limit=50
obsidian dev:debug off
```

## Notes

- `dev:errors clear` is useful before each reload/reproduction cycle so the next error capture is attributable to the latest attempt.
- `dev:errors` can surface uncaught plugin/runtime errors without attaching the debugger first.
- `dev:console` requires `obsidian dev:debug on` first. If not attached, it will fail with `Debugger not attached`.
- `eval` is the fastest way to inspect live renderer behavior, plugin state, and runtime capabilities like `process.versions` or timer APIs.
- If the bug is already producing runtime errors, collect `dev:errors` before adding instrumentation.
- Fall back to raw Electron remote debugging only if the CLI path is unavailable.
