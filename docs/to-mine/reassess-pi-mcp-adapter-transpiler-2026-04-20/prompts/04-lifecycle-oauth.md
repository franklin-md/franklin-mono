Agent: `Kepler`

You are analysing the session lifecycle, async init, and OAuth story in `pi-mcp-adapter`. Do not read `.context/attachments` or `.context/algebra`.

Inputs:
- `.context/external/pi-mcp-adapter/index.ts` — the top-level extension entrypoint. The `session_start` / `session_shutdown` handlers there are the anchor.
- `.context/external/pi-mcp-adapter/init.ts`, `lifecycle.ts`, `server-manager.ts` — how servers are started, idled, reconnected.
- `.context/external/pi-mcp-adapter/mcp-auth-flow.ts`, `mcp-auth.ts`, `mcp-callback-server.ts`, `mcp-oauth-provider.ts`, `oauth-handler.ts` — OAuth bootstrap and callback.
- Franklin-side: `packages/agent/src/` session code and `packages/extensions/src/systems/` to understand what session-lifecycle semantics Franklin has today, if any. Also `packages/mini-acp/src/` for any session-boundary hooks on the protocol layer.

Answer:

1. **What lifecycle shape does the adapter assume?** Be concrete: when is the `session_start` handler called relative to `session_shutdown`? Is there exactly one pairing per process lifetime or many? The adapter uses a `lifecycleGeneration` counter and idempotent cleanup — what race conditions is it defending against?
2. **What state lives across vs inside a session?** For example, OAuth tokens, metadata cache, active MCP server connections, and the local callback HTTP server. Which of these are process-scoped vs session-scoped?
3. **Can Franklin's current session model express this?** Read Franklin's session/extensions code, then answer honestly:
   - Does Franklin have any callback that matches `session_start` fire-and-forget-with-promise semantics?
   - Does Franklin have any `session_shutdown` counterpart for graceful teardown?
   - Does Franklin support an extension that keeps long-lived state (like an OAuth callback server on a random port) across session boundaries within the same process?
4. **OAuth callback server specifically.** The adapter spins up a local HTTP server for OAuth redirects. This is a process-level side-effect in a Pi extension. Is this kind of side-effect compatible with Franklin's extension model today, or does it violate a Franklin invariant (e.g., extensions must be compile-time pure, extensions cannot own ports, etc.)?
5. **`pi.sendMessage({ triggerTurn: true })` pattern.** The CHANGELOG and `init.ts` reference UI prompts/intents triggering agent turns via `pi.sendMessage`. Does Franklin have anything that lets an extension inject a user-like message into the active session and cause a turn? If not, how big a gap is that?
6. **Summary — lifecycle & side-effect gap score.** Rough call on how transpilable this extension's lifecycle/OAuth machinery is today vs how much new primitives it would need.

Keep it under 1000 words. Do not dwell on the UI panel (other agents cover that). Cite files and line numbers.
