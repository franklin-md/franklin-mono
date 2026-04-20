# Pi→Franklin API Surface Mapping: MCP Adapter

## Per-Surface Mapping Table

| Pi API | Franklin Analog | Gap | Shimability |
|--------|-----------------|-----|------------|
| `pi.registerTool(spec, handler)` | `api.registerTool(spec, handler)` in CoreAPI (`packages/extensions/src/systems/core/api/api.ts:59-67`) | None — semantically identical. Both register at compile-time; handler receives typed params + runtime context. | Already maps cleanly. |
| `pi.registerFlag(name, config)` | No equivalent | Franklin has no flag/configuration registration system. Pi allows dynamic flag definition with type metadata (string, number, etc.). Franklin extensions are purely functional; config comes externally via DependencyRuntime. | Requires new primitive: a `registerFlag` method on an API family, or moving flags to app-level config. |
| `pi.registerCommand(name, handler)` | No equivalent | Franklin's extension API lacks command registration. Pi commands (`/mcp`, `/mcp-auth`) are CLI-style endpoints invoked by user; handlers receive args string + context. | Requires new `CommandAPI` extension surface, or bridge via tool registration + app-level dispatch. |
| `pi.on('session_start')` | No equivalent | Franklin has session lifecycle in `packages/extensions/src/systems/sessions/runtime/runtime.ts` but no entry hook. `session_start` fires once per fresh session on Pi; extensions must initialize state here. | Possible via SessionAPI extension event, but semantics differ: Franklin sessions fork/resume; Pi sessions are linear. |
| `pi.on('session_shutdown')` | No equivalent | No graceful shutdown event exposed to extensions. Pi fires `session_shutdown` to allow cleanup (closing servers, flushing state). | Requires `SessionAPI` event or decorator-based cleanup hook on `CoreRuntime.dispose()`. |
| `pi.sendMessage(text, options)` | No equivalent | Pi allows extension→UI messaging (notifications). Franklin's equivalent is implicit: tools return `ToolOutput` which flows through Mini-ACP stream. | Tools can emit text; no out-of-band notification API. Would require agent UI channel. |
| `pi.getAllTools()` | No equivalent | Pi provides introspection of all registered tools for help/search. Franklin's registry is compile-time; no runtime `getAllTools()` introspection. | Possible via middleware decorator that snapshots tool set at compile time. |
| `pi.getFlag(name)` | No equivalent | Flags must be retrieved at runtime. Franklin has no flag storage or retrieval. | Depends on `registerFlag` implementation. |
| `ctx.hasUI` | No equivalent | Pi context includes a boolean flag indicating whether UI is available (affects whether to call `ctx.ui.*`). Franklin assumes context is always present (no conditional UI model). | Possible: wrap CoreRuntime with UI capability flag, or always assume no UI (tools log instead of notify). |
| `ctx.ui.notify(text, level)` | No equivalent | Pi notifies user via `ctx.ui.notify(msg, 'info'│'error'│'warning'│'success')`. Franklin tools return structured output; no out-of-band notification. | Tokens/messages flow through agent stream; no separate notification channel. |
| `ctx.ui.setStatus(key, text)` | No equivalent | Pi sets a persistent status bar field (e.g., `"mcp-auth"` → `"Authenticating..."`). Franklin has no status bar API. | Would require app-level UI component subscription to extension state. |
| `ctx.ui.custom(renderer, options)` | No equivalent | Pi renders custom TUI panels (e.g., interactive MCP server list). Renderer receives TUI library + theme + keybindings + done callback. | Not shimmed; requires deep Franklin UI integration (agent can return structured data; app renders). |

## Categorical Gaps

1. **Configuration System**: Pi's `registerFlag` + `getFlag` allow extensions to define and access configuration keys. Franklin has no equivalent — config is external (dependency injection via `DependencyRuntime<Name, T>`).

2. **Command System**: Pi's `registerCommand` + `/mcp`, `/mcp-auth` commands. Franklin has no command registration. Extensions can only expose tools; command-style UX must be shimmed as tool calls or app-level dispatch.

3. **Session Lifecycle Events**: Pi's `session_start` and `session_shutdown`. Franklin has session forking/resuming but no entry/exit hooks. Extensions initialize state ad-hoc or via tool calls.

4. **UI Notification API**: Pi's `ctx.ui.notify`, `ctx.ui.setStatus`, `ctx.ui.custom` provide out-of-band user feedback. Franklin's agent model is message-centric: all output flows through the Mini-ACP stream (tool results, agent text). No separate notification/status channel.

5. **Tool Registry Introspection**: Pi's `getAllTools()` for help/search. Franklin's registry is static at compile time; no runtime lookup.

## What Franklin Already Handles Cleanly

1. **Tool Registration** (`api.registerTool`): Identical semantics to Pi. Tools are registered with name, description, input schema, and a handler that receives params + runtime context. ✓

2. **Runtime Context Model** (`CoreRuntime`): Both Pi and Franklin pass a context object to handlers. Franklin's `BaseRuntime<State>` is structured and composable; Pi's `ExtensionContext` is simpler but covers the same ground (file access, messaging, UI checks). ✓

3. **Handler Binding**: Both bind handlers at compile-time with a capture closure. Pi extracts functions into local bindings before tool execution (see `index.ts:52-76`); Franklin's extension algebra enforces the same pattern. ✓

## Semantic Hazards

1. **Flag Registration Timing**: Pi registers flags *inside* the extension default export. If flags are accessed before the extension loads, they fail. Franklin has no flags, so this doesn't arise — but a shim must decide whether flags are pre-registered or lazy-loaded.

2. **Session Lifecycle Isolation**: Pi's `session_start` handler expects to be called exactly once per fresh session and initialize state. But if the extension body also registers tools at the top level (lines `68–77`), tool registration happens *before* `session_start` fires. Franklin doesn't have this ordering issue because registration and runtime are separate compilation phases — but a session-gated initialization pattern (e.g., `let state = null; pi.on('session_start', () => state = initialize())`) cannot be directly shimmed without runtime state management in the extension wrapper.

3. **ctx.hasUI Pattern**: Pi code threads `if (ctx.hasUI)` checks throughout handlers. Franklin's extension handlers assume context is always available. A shim must either:
   - Always assume no UI (safe but loses notifications).
   - Detect UI capability once at init and store in extension state (violates extension algebra rule #1: dependencies flow through runtime, not closure).
   - Wrap the runtime with a UI capability flag and pass it through on every call (verbose but correct).

4. **Tool Executor Signature Mismatch**: Pi's tool `execute(toolCallId, params, signal, onUpdate, ctx)` receives an AbortSignal and update callback; Franklin's `execute(params, runtime)` receives no signal. Long-running tools cannot be cleanly cancelled in Franklin without extending `ToolExecuteReturn`.

## Concrete File Citations

### Pi-Side Sources
- **Main extension entry**: `/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-mcp-adapter/index.ts` (lines 13–305)
  - Lines 68–77: Direct tool registration (top-level, before session_start).
  - Lines 86–135: Session lifecycle handler (`pi.on('session_start')`).
  - Lines 137–151: Session shutdown handler (`pi.on('session_shutdown')`).
  - Lines 153–219: Command handlers (`pi.registerCommand`).
- **Commands module**: `/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-mcp-adapter/commands.ts` (lines 11–238)
  - Lines 12, 51, 131: `ctx.hasUI` checks.
  - Lines 47, 68, 158, 179, 224: UI API calls (`ctx.ui.notify`, `ctx.ui.setStatus`, `ctx.ui.custom`).
- **Init module**: `/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-mcp-adapter/init.ts` (lines 28–203)
  - Lines 41: `ctx.hasUI ? ctx.ui : undefined`.
  - Line 52: `pi.sendMessage` call.
  - Lines 32, 79: `pi.getFlag` calls.
- **Lifecycle**: `/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-mcp-adapter/lifecycle.ts` (state machine, no Pi API usage).
- **Auth**: `/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/external/pi-mcp-adapter/mcp-auth-flow.ts` (OAuth, no Pi API usage).

### Franklin-Side Sources
- **CoreAPI**: `/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/extensions/src/systems/core/api/api.ts` (lines 28–68)
  - `registerTool` overloads match Pi's signature.
  - Events: `prompt`, `cancel`, `systemPrompt`, `chunk`, `update`, `turnEnd`, `toolCall`, `toolResult`.
- **CoreRuntime**: `/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/extensions/src/systems/core/runtime.ts` (lines 22–85)
  - `prompt`, `cancel`, `setLLMConfig` methods.
  - No `hasUI`, `sendMessage`, or flag access.
- **Sessions API**: `/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/extensions/src/systems/sessions/api/index.ts` (types only)
  - `SessionRuntime` includes `session.child()`, `session.fork()`, `session.removeSelf()` but no entry/exit events.
- **Extensions README**: `/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/extensions/README.md` (lines 1–77)
  - Extension algebra rules: dependencies through runtime, no API calls in closures.
- **Mini-ACP README**: `/Users/afv/conductor/workspaces/franklin/yangon-v2/packages/mini-acp/README.md` (protocol spec)
  - Tool execution returns `ToolResult`; no out-of-band notifications.

