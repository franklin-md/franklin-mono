# Pi MCP Adapter: Extension API Inventory

## 1. High-Level Overview

The pi-mcp-adapter is a context-efficient gateway to MCP (Model Context Protocol) servers. It replaces hundreds of verbose tool definitions with a single ~200-token proxy tool that discovers and invokes MCP tools on-demand. The extension also supports a "direct tools" mode where select MCP tools are promoted to first-class Pi tools (bypassing the proxy). It provides UI resource integration via a local HTTP server that hosts interactive dashboards with bidirectional messaging back to the agent. Servers are lazy-loaded (connect on first use, disconnect on idle timeout), with metadata cached to disk to enable search/list without live connections.

## 2. Pi API Surfaces Touched

### Registration Calls

- `pi.registerTool()` — register the proxy `mcp` tool (index.ts:222–303)
- `pi.registerTool()` — register each direct tool (index.ts:69–76, direct-tools.ts:244–399)
- `pi.registerFlag("mcp-config", ...)` — CLI flag for custom config path (index.ts:81–84)
- `pi.registerCommand("mcp", ...)` — interactive MCP commands: status, tools, reconnect, reconnect <server> (index.ts:153–192)
- `pi.registerCommand("mcp-auth", ...)` — OAuth setup command (index.ts:194–219)

### Event Subscriptions

- `pi.on("session_start", async (_event, ctx) => ...)` — Initialize MCP state, load config, connect eager/keep-alive servers, set up OAuth (index.ts:86–135)
- `pi.on("session_shutdown", async () => ...)` — Graceful shutdown: close all servers, flush metadata cache, tear down OAuth (index.ts:137–151)

### Imperative Actions (Tool Execution & State)

- `pi.getAllTools()` — get list of all registered Pi tools for search context (index.ts:79, proxy-modes.ts:231–296)
- `pi.sendMessage(message, options)` — send structured messages to agent with optional `triggerTurn` (init.ts:54, proxy-modes.ts:56–131, ui-session.ts passthrough)
- `pi.getFlag("mcp-config")` — retrieve optional config file path override (init.ts:32, commands.ts:191)

### Context (ctx) Methods in Handlers

- `ctx.hasUI` — detect if UI is available (index.ts:161, 166, 184, 199, 213; init.ts:41, 105, 124, 145, 181; commands.ts:12, 47, 77, 105, 117, 161, 199, 224; proxy-modes.ts:238; direct-tools.ts:276, 299)
- `ctx.ui.notify(text, level)` — show notifications (index.ts:161, 166, 199, 213; init.ts:125, 136, 145, 150, 181, 297; commands.ts:47, 78, 94, 108, 110, 117, 164, 166, 200; proxy-modes.ts:238; direct-tools.ts:276)
- `ctx.ui.setStatus(key, text)` — update status bar (init.ts:106, 297, 306, 312; commands.ts:158, 179)
- `ctx.ui.custom(fn, options)` — render custom TUI panel for MCP configuration (commands.ts:224–237); invokes mcp-panel.ts with theme/keybindings callback
- `ctx.ui.theme.fg(color, text)` — apply colors to status text (init.ts:268)

## 3. External Pi Imports

- `@mariozechner/pi-coding-agent` — `ExtensionAPI`, `ToolInfo`, `ToolDefinition`, `AgentToolResult`, `ExtensionContext` (index.ts, init.ts, commands.ts, direct-tools.ts, proxy-modes.ts, state.ts, types.ts)
- `@mariozechner/pi-ai` — `TextContent`, `ImageContent` (types.ts)
- `@mariozechner/pi-tui` — `matchesKey`, `truncateToWidth`, `visibleWidth` (mcp-panel.ts)

## 4. API Entry Point Counts

| Family | Count | Examples |
|--------|-------|----------|
| **Registration** | 5 | registerTool (proxy + direct), registerFlag, registerCommand (mcp, mcp-auth) |
| **Events** | 2 | session_start, session_shutdown |
| **Imperative** | 3 | getAllTools, sendMessage, getFlag |
| **Context (UI)** | 5 | hasUI, notify, setStatus, custom, theme.fg |
| **Total Distinct Entry Points** | **15** | |

## 5. Unusual/Rare Surfaces

1. **Tool Introspection via `pi.getAllTools()`** (index.ts:79, proxy-modes.ts:296) — Adapter introspects registered Pi tools to include them alongside MCP tools in search results. Rare across pi-mono examples; enables hybrid tool discovery.

2. **Proxy Tool Pattern with Lazy Sub-Tool Binding** (index.ts:222–303, direct-tools.ts:244–399) — Single proxy tool dynamically dispatches to hundreds of MCP tools. Each dispatch (`mcp({ tool: "...", args: "..." })`) can trigger fresh MCP server connections. Direct tools are registered dynamically at startup from metadata cache; if cache is stale, they fall back to proxy-only and cache refreshes in background.

3. **HTML UI Resources Bundled in Extension** (ui-server.ts:70–100, ui-resource-handler.ts:21–87, ui-session.ts:90–140) — MCP servers can ship interactive UIs as resources (`ui://` URIs). Adapter hosts them locally on ephemeral HTTP port, applies CSP from MCP metadata, and manages bidirectional messaging (UI → agent prompts/intents, agent → tool results/patches).

4. **ctx.ui.custom() for TUI Overlay** (commands.ts:221–237) — Interactive MCP panel rendered via custom TUI handler. Allows user to toggle direct/proxy mode per tool, reconnect servers, check connection status, all with live theme/keybindings. Changes persisted back to config file.

5. **Streaming & Visualization Support** (ui-stream-types.ts exports, ui-session.ts:46–77) — MCP tools can emit structured visualization streams (phase/frame/status). Adapter encodes these into Pi message `structuredContent` with stream IDs and sequences, enabling agent to push live updates to open UIs without replacing the window.

## 6. Persistence & IPC Model

### State Management
- **In-Memory State**: `McpExtensionState` (state.ts) holds tool metadata, server connections, UI sessions, failure tracking. Lives per-session, reset on `session_start`/`session_shutdown`.
- **Disk Cache**: `~/.pi/agent/mcp-cache.json` stores tool & resource metadata per server (hash + tool names/schemas + resource URIs). Populated on first server connection, loaded at startup to enable search without live connections. Flushed on graceful shutdown (init.ts:28, 251–257).
- **Config File**: User writes `~/.pi/agent/mcp.json` or project `.pi/mcp.json`. Loaded synchronously at extension init. Panel writes back direct-tools toggles on user request.
- **OAuth Credentials**: Stored via `mcp-auth.js` in OS keychain or secure storage (not inspected, but referenced in mcp-auth-flow.ts:24–30).

### Subprocess / Long-Lived Connections
- **Stdio Servers**: Spawned via `spawn()` (referenced in server-manager.ts, not shown) for each configured MCP server with `command`/`args`. Processes kept alive or reaped per lifecycle mode (lazy/eager/keep-alive). Stdin/stdout piped to MCP SDK's stdio transport.
- **HTTP Servers**: User configures `url` for HTTP-based MCP servers (StreamableHTTPClientTransport). Adapter uses OAuth SDK to auto-discover/dynamically-register clients.
- **UI Server**: Adapter spawns its own ephemeral HTTP server per active UI session (ui-server.ts:startUiServer, port auto-allocated). Hosts HTML template + static assets, proxies MCP tool calls from UI via JSON POST, collects session messages. Closed when UI window dismissed or tool completes.
- **No Shared State Across Sessions**: Each Pi session spawns its own MCP server processes and UI servers. No cross-session connection pooling or IPC.

### Health Checks & Reconnection
- **Keep-Alive Servers**: McpLifecycleManager runs a health-check interval (30s default, lifecycle.ts:48–53) that auto-reconnects servers marked `keep-alive` if connection drops.
- **Idle Timeout**: Non-keep-alive servers auto-disconnect after idle period (10m default, configurable per-server). Next tool call triggers lazy reconnect.

## 7. Tool Definition & Parameter Handling

- **Proxy Tool**: Single descriptor with generic object params (index.ts:227–237), delegates parsing to sub-action handlers (executeCall, executeSearch, etc. in proxy-modes.ts).
- **Direct Tools**: Each registered individually with MCP tool's original JSON Schema (index.ts:74) via `Type.Unsafe<Record<string, unknown>>`. Pi validates against schema; MCP server validates at call time.
- **Parameters**: Direct tools accept params as JavaScript objects. Proxy tool accepts `args` as JSON string, parsed and validated by handler (index.ts:249–262).

## 8. Key Implementation Patterns

1. **Lazy Initialization**: `initPromise` guards prevent race conditions during session startup (index.ts:110–134). Multiple handlers await the same promise.
2. **Lifecycle Generation Counter**: Prevents stale session state cleanup from interfering with concurrent startup (index.ts:87, 101–102, 113, 126–129, 138).
3. **Metadata Validation**: Cache entries are validated against current config hash; stale caches trigger refresh (init.ts:92, direct-tools.ts:88).
4. **Backoff Tracker**: Failed server connections are tracked with timestamps; reconnect attempts are backoff-delayed (init.ts:271–277, 279–315).

## 9. Conclusion

The adapter is a sophisticated proxy that minimizes context burn while providing full access to MCP ecosystems. It touches 15 distinct Pi API entry points, with heavy reliance on `registerTool`, `on("session_start")`, `ctx.ui.*`, and `sendMessage`. The unusual "direct tools" pattern and HTML UI resource hosting (with local HTTP server) are distinctive compared to simpler Pi extensions. Persistence is split: config on disk, metadata in JSON cache, OAuth credentials in keychain, server processes spawned ad-hoc per session.

---

**Report generated:** 2026-04-20  
**Analyzed files:** index.ts, types.ts, init.ts, commands.ts, direct-tools.ts, proxy-modes.ts, lifecycle.ts, ui-resource-handler.ts, mcp-auth-flow.ts, ui-session.ts, ui-server.ts, state.ts, mcp-panel.ts
