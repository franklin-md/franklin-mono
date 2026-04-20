# Transpilation Hardness: pi-mcp-adapter → Franklin

## Overview
The pi-mcp-adapter (8,771 TS LOC excluding tests) is a Pi extension that wraps MCP servers, exposing them as proxy or direct tools without burning context. Transpiling to Franklin requires bridging architectural gaps: Pi's event model (session_start, session_shutdown), Pi's UI/TUI paradigm (ctx.ui.custom), and Pi's turn-injection API (pi.sendMessage).

## 1. High-Level Categorization

### Transpiles Today
- **Direct tool registration** (1,800 LOC): pi.registerTool() → api.registerTool(). Franklin's spec+execute overload mirrors Pi's API shape. 68/9,417 LOC from index.ts, direct-tools.ts direct reg paths map cleanly.
- **Proxy tool registration** (300 LOC): Single gateway tool in index.ts lines 221–303 translates to Franklin register call. Straightforward.
- **Metadata cache load/flush** (400 LOC): metadata-cache.ts reads/writes JSON files. Franklin has StoreAPI for shared storage. No blocker, just FileSystem I/O.
- **Config loading** (250 LOC): config.ts parses JSON; Franklin extends via environment/store. No blocker.
- **MCP server lifecycle** (400 LOC): server-manager.ts, lifecycle.ts manage connections. Portable — stateless connection pool, no Pi-specific deps.
- **Tool metadata extraction** (300 LOC): tool-metadata.ts, tool-registrar.ts build schemas from MCP. Pure logic, no Pi deps.
- **OAuth credential flow** (800 LOC): mcp-auth.ts, mcp-auth-flow.ts exchange tokens offline. Portable (relies on env vars, not on Pi UI).

Subtotal: ~4,250 LOC (45%).

### Transpiles with Thin Shim
- **Flag registration** (80 LOC): pi.registerFlag() in index.ts line 81. Franklin has no flag system. Shim: Store flag value in environment or config object, pass via context. ~100 LOC shim.
- **Command registration** (250 LOC): pi.registerCommand() in index.ts lines 153–219. Franklin has no CLI slash-command dispatch. Shim: Wrap each command as a zero-argument tool that reads intent from context (e.g., mcp_status, mcp_reconnect_chrome_devtools). ~300 LOC shim + tool wrappers.
- **Direct browser open** (100 LOC): utils.ts openUrl() calls pi.exec("open", ...). Franklin can't spawn OS processes. Shim: Return a deep link or environment.web.fetch stub. ~50 LOC.
- **getAllTools() introspection** (50 LOC): index.ts line 79 calls pi.getAllTools() to refine search. Shim: Empty array or static list — Franklin's tool registry is opaque to extensions. ~50 LOC.

Subtotal: ~480 LOC (5%) → ~500 LOC shim code.

### Requires New Franklin Primitive
- **session_start / session_shutdown lifecycle** (120 LOC): index.ts lines 86–151. Pi fires these on every new conversation. Franklin has no lifecycle hooks exposed in CoreAPI. Blocker.
  - Must add on('sessionStart') and on('sessionShutdown') to CoreAPI.
  - Adapter needs to initialize MCP state on session start, tear down on shutdown.
  - Affects state management: session-local MCP connections, per-session metadata cache key.

- **UI custom panels (TUI)** (2,800 LOC): commands.ts ctx.ui.custom(), mcp-panel.ts, glimpse-ui.ts. These assume a TUI interface (pi-tui with color codes, layouts, keybindings). Franklin has no TUI-equivalent API.
  - mcp-panel.ts: ~800 LOC of TUI state machine (fuzzy filter, multi-select, connections status).
  - ui-server.ts + ui-session.ts: ~1,200 LOC manage an embedded HTTP server + SSE channel for iframe-based UI.
  - host-html-template.ts: ~600 LOC build CSP-sandboxed HTML iframes. Portable code, but requires Franklin's browser/iframe capability.

Blocker: Franklin needs iframe/modal UI primitives + supervised subprocess support.

- **pi.sendMessage() turn injection** (150 LOC): init.ts line 54, proxy-modes.ts uses state.sendMessage(message) to inject human-like messages mid-session. Pi's turn model allows extensions to append messages to the conversation buffer. Blocker.
  - Franklin's turn model (mini-acp) does not expose turn-injection — turns are read-only to extensions.
  - Would require adding a new runtime capability: runtime.sendMessage(text, role?: 'user').

Subtotal: ~3,070 LOC (33%) — three blockers.

### Fundamentally Incompatible
- **Pi-TUI interactions** (200 LOC): glimpse-ui.ts uses Pi's TUI framework to open modal windows. Not reproducible in Franklin (no TUI).
- **ctx.ui.setStatus() / ctx.ui.notify() terminal outputs**: commands.ts, init.ts rely on these. Franklin has no terminal UI. Shim to console.log or suppress.

Subtotal: ~200 LOC (2%).

## 2. Line-of-Code Estimate per Bucket

| Bucket | LOC | % |
|--------|-----|---|
| Transpiles today | 4,250 | 45% |
| Shim (thin) | 480 | 5% |
| Requires primitive | 3,070 | 33% |
| Incompatible | 200 | 2% |
| Test + glue | ~1,400 | 15% |
| Total | 9,400 | 100% |

## 3. Ranked Blockers

1. **session_start/session_shutdown lifecycle hooks** (120 LOC adapter, 50 LOC Franklin API)
   - Unblocks: State initialization, OAuth bootstrap, server startup sequencing.
   - Without it: Adapter cannot initialize on-demand, cannot clean up on shutdown.

2. **Turn injection API (pi.sendMessage replacement)** (150 LOC adapter, 40 LOC Franklin API)
   - Unblocks: UI session message capture and re-injection, prompt handoff patterns.
   - Without it: UI workflows cannot feed prompts back into the agent loop.

3. **Iframe/modal UI + supervised subprocess** (2,800 LOC adapter UI code, 200+ LOC Franklin)
   - Unblocks: Interactive MCP panel (server browser, direct-tool toggle), UI resource rendering.
   - Without it: UI sessions silently fail; operator cannot browse/manage servers interactively.

## 4. Transpiler Strategy

### Minimum Implementation

Franklin API Additions (scope: ~130 LOC in CoreAPI + registrar):
- CoreAPI.on('sessionStart', handler: (runtime: Runtime) => Promise<void>): void
- CoreAPI.on('sessionShutdown', handler: (runtime: Runtime) => Promise<void>): void
- Runtime.sendMessage(text: string, role?: 'user'): Promise<void>

Transpiler Runtime Shim (~600 LOC glue in extension):
- Fake pi.getAllTools() → return [] or scan runtime tool registry (opaque, will be static list).
- Fake pi.registerFlag() → store in map passed to handlers.
- Fake pi.registerCommand() → wrap as zero-arg tools named mcp_{subcommand}.
- Fake pi.exec(cmd, args) → console.error + throw (or return stub result).
- Fake ctx.ui.custom() → ignore (suppress panel, degrade gracefully).
- Fake ctx.ui.notify(), ctx.ui.setStatus() → console.log or suppress.

Rewriting (~400 LOC code changes in adapter source):
- index.ts: Replace pi.on("session_start", ...) with api.on("sessionStart", ...) and adapt handler signature.
- init.ts: Replace pi.sendMessage() with runtime.sendMessage() (if added).
- commands.ts: Remove UI panel commands or wrap as no-ops.
- direct-tools.ts, proxy-modes.ts: No changes needed (logic is pure).

### With UI Primitives (stretch)

Assuming Franklin adds api.registerPanel() and subprocess supervision:
- Add ~200 LOC to mcp-panel.ts to adapt TUI state machine to Franklin modal rendering.
- Add ~150 LOC wrapper around ui-server.ts for iframe relay.

## 5. Transpiler Coverage Estimate

| Scenario | Coverage | Notes |
|----------|----------|-------|
| Shim only (no lifecycle hooks) | 0% | Adapter does not run — state is never initialized. |
| + session_start/shutdown | ~35% | Direct tool calls work (no proxy tool). Metadata cache loads. No UI, no turn injection. |
| + turn injection | ~45% | UI sessions can extract prompts; mode switches work. Still no interactive panel. |
| + iframe/panel UI | ~65% | Full MCP panel, server browser, direct-tool toggles available. |
| + cli-equivalent tool wrappers | ~80% | /mcp status, /mcp-auth become tools. User can reconnect servers. |
| Full parity | ~95% | All features except TUI modal windows (e.g., Glimpse). |

## 6. Risk of Silent Drift

Even with a complete shim, behavioral traps lurk:

1. **session_start timing**: Pi fires session_start exactly once per conversation; Franklin's SessionSystem may fire it per-request or batch. Adapter assumes one initialization per session, not per-turn. Trap: Metadata reloads on every turn if lifecycle is wrong.

2. **turn injection side effects**: pi.sendMessage("user context...") inserts into the current turn's history. Franklin's turn model is immutable mid-turn. Trap: Injected messages appear in next turn, breaking UI session handoff.

3. **ui.custom() blocking**: Adapter awaits ctx.ui.custom() completion (line 224 in commands.ts). If Franklin's modal API is async but not-actually-blocking (e.g., spawns in background), Trap: Handler returns immediately; panel changes never persist.

4. **Metadata cache invalidation**: Adapter caches tool schemas keyed by server hash (lifecycle.ts). If Franklin's session scope is finer (per-request), cache keys collide. Trap: Stale schemas served.

5. **OAuth token storage**: adapter stores tokens in Node.js process env (mcp-auth.ts). Franklin may sandbox extensions; env vars may not persist across sessions. Trap: OAuth re-auth loop on every session start.

6. **Idle connection reaping**: lifecycle.ts schedules setInterval() health checks every 30s. Franklin may garbage-collect timers across requests. Trap: Servers never auto-reconnect; connections leak.

7. **getAllTools() opacity**: Adapter uses pi.getAllTools() to avoid re-registering builtin tools (index.ts line 79). If Franklin's tool registry is not introspectable, fallback to hardcoded list. Trap: Collision risk if Franklin adds MCP-named tools.

Mitigation: Expose runtime hook for each trap; document session/turn model assumptions.

Lines referencing blockers:
- session_start: index.ts:86–151
- sendMessage: init.ts:54, proxy-modes.ts:56–106
- ui.custom: commands.ts:224–237
- TUI: mcp-panel.ts:1–500+, glimpse-ui.ts:1–50
- ui-server: ui-server.ts:1–600+
