# UI Panel Feasibility: Pi-MCP-Adapter → Franklin

## 1. MCP Panel Architecture

**Rendering Stack:** The MCP panel is a **TUI-only component** built on `pi-tui` primitives, NOT a webview.

- **Entry point**: `commands.ts:openMcpPanel()` (lines 183–238) calls `ctx.ui.custom()` with a factory function.
- **Component**: `mcp-panel.ts` (740 LOC) is a stateful TUI renderer implementing Pi's `Component` interface (with `render(width): string[]` and `handleInput(data)` methods).
- **Rendering**: Pure terminal ANSI escape sequences (no HTML, no browser). The panel renders a bordered box with a scrollable list of servers/tools, fuzzy search, toggle state, and status feedback.
- **Modal lifecycle**: Managed entirely by Pi: `ctx.ui.custom(factory, { overlay: true, overlayOptions: {...} })` returns a `Promise<McpPanelResult>` once the user confirms or cancels.

**Host ↔ Panel Interface (the semantic contract):**
- **Host (Pi) can**:
  - Invoke the panel via `ctx.ui.custom(factory)`.
  - Pass a `done(result)` callback to receive the result.
  - Provide `tui.requestRender()` to trigger redraws.
  - Provide color theme/keybindings/terminal width via factory args.
- **Panel can**:
  - Call `callbacks.getConnectionStatus(serverName)` and `callbacks.reconnect(serverName)` to query/update live connection state.
  - Call `callbacks.refreshCacheAfterReconnect()` to reload metadata after reconnect.
  - Return an `McpPanelResult` with the final tool selection changes.

---

## 2. UI Resource & MCP-UI Side (the iframe ecosystem)

**Host-HTML Template** (`host-html-template.ts`, 427 LOC) and **UI Resource Handler** (`ui-resource-handler.ts`, 145 LOC) handle MCP-server-shipped HTML UIs (e.g., custom UI from a tool's `chrome_devtools_take_screenshot` resource).

**Architecture:**
- MCP servers can return `ui://` resources in their tool definitions.
- The adapter fetches these via `ReadResource` RPC, extracts HTML + CSP metadata.
- An HTML host page is generated (bundled JS + iframe + PostMessage bridge).
- An `app-bridge.bundle.js` (67 lines; thin wrapper around `@modelcontextprotocol/ext-apps/app-bridge`) mediates between the sandboxed iframe and the host.
- Messages flow: iframe ↔ PostMessage ↔ host ↔ backend API endpoints (`/proxy/tools/call`, `/proxy/ui/message`, etc.).

**Assessment:** This is **entirely host-agnostic**—it's not Pi-TUI-specific. The MCP-UI surface (AppBridge, tool consent, stream events) could be served to any host with a webview + event source + HTTP POST. The only Pi-specific wiring is in `commands.ts` (how the panel is opened) and optional `glimpse-ui.ts` (native window for macOS).

---

## 3. The `ctx.ui.custom` Calls in `commands.ts`

Franklin's `ctx.ui` (from `@mariozechner/pi-coding-agent`) provides:

```typescript
ui.custom<T>(
  factory: (tui: TUI, theme: Theme, keybindings: KeybindingsManager, done: (result: T) => void)
           => Component & { dispose?(): void },
  options?: { overlay?: boolean; overlayOptions?: ... }
): Promise<T>
```

This interface is **Pi-TUI-specific by design**. It assumes:
- A TUI (terminal UI) with `requestRender()` and size queries.
- A theme system for ANSI color codes.
- Keybindings to be forwarded.
- A Component interface with `render()` and `handleInput()` methods.

Franklin's `ExtensionUIContext` (types.ts, pi-mono-reference) also provides:
- `select()`, `confirm()`, `input()` — simple dialog primitives.
- `notify()`, `setStatus()` — notifications.
- `editor()` — multiline text editing.
- `setWidget()`, `setHeader()`, `setFooter()` — persistent UI slots.

**Rewritability**:
- The panel **cannot be rewritten against `select/confirm/input`** because it needs persistent state (expanded/collapsed servers, search, cursor position) and full keyboard control (↑↓, space, ?, Ctrl+R).
- The panel **must remain on `ctx.ui.custom()`** or equivalent (a host-agnostic "custom component" API).
- The notification/status lines (`ctx.ui.notify`, `ctx.ui.setStatus`) in the panel are **easily transpilable** to a Franklin `NotificationAPI`-style surface.

---

## 4. Semantic Operations of the MCP Panel

**From the panel's perspective, the host must provide:**

1. **Lifecycle control**: `done(result)` callback to report completion or cancellation.
2. **TUI rendering infrastructure**: `tui.requestRender()` to schedule redraws; terminal width + keybindings forwarded via the factory closure.
3. **Connection callbacks**:
   - `getConnectionStatus(serverName)` → connection state for display.
   - `reconnect(serverName)` → async reconnect with result callback.
   - `refreshCacheAfterReconnect(serverName)` → reload tool metadata post-connect.

**From the host's perspective, the panel provides:**

- A terminal component with scrollable list, search, and toggle state.
- Final `McpPanelResult` with the set of tools to enable as "direct" per server.

**This is NOT specific to Pi-TUI.** Any host with a terminal renderer, event loop, and callback semantics could adapt it. Franklin would need to provide an equivalent of `ctx.ui.custom()` that accepts a TUI component factory.

---

## 5. Transpilation Estimate (LOC)

| Category | LOC | Transpilation Cost | Notes |
|----------|-----|-------------------|-------|
| **mcp-panel.ts** | 740 | **None** (reusable) | Pure TUI component; only depends on `pi-tui` primitives (Component, matchesKey, truncateToWidth). No Pi-specific wiring. Can be extracted into a shared library. |
| **host-html-template.ts** | 427 | **None** (host-agnostic) | HTML + JS host for MCP-UI iframes. Reusable in any host with webview support. |
| **ui-resource-handler.ts** | 145 | **None** (reusable) | Fetches MCP UI resources; only calls `manager.readResource()`. Logic is host-agnostic. |
| **commands.ts (UI calls)** | ~40 | **Minimal** | `ctx.ui.custom()` call (line 224) is the only Pi-specific surface. Rewrite to Franklin equivalent: `ctx.ui.customPanel()` or similar. Rest is logic (config building, callback wiring). |
| **commands.ts (notify/status)** | ~30 | **Trivial** | `ctx.ui.notify()`, `ctx.ui.setStatus()` calls. Transpilable to Franklin `ctx.ui.notify()` or a custom `StatusAPI`. |
| **mcp-oauth-provider.ts** | 288 | **None** | Pure MCP SDK integration; no UI calls. |
| **glimpse-ui.ts** | 80 | **Keep as fallback** | Native window opener for macOS. Not essential; can be an optional feature flag. |
| **app-bridge.bundle.js** | 67 | **None** | Thin wrapper around MCP's AppBridge. Stays as-is. |

**Summary:**
- **~1740 LOC are drop-in reusable** (mcp-panel, host-html-template, ui-resource-handler, mcp-oauth-provider).
- **~70 LOC require minimal abstraction** (ctx.ui.custom call + notify/setStatus calls).
- **~80 LOC are platform-specific** (glimpse-ui, which is optional).

---

## 6. Conclusion: What Can and Cannot Be Transpiled

| Scope | Assessment |
|-------|-----------|
| **The MCP panel component itself** | ✅ **Fully reusable**. Extract to shared library; only depends on TUI primitives, not Pi. |
| **MCP-UI (iframe + AppBridge)** | ✅ **Host-agnostic**. Stays unchanged in any Franklin-based adapter. |
| **Status/notification wiring** | ✅ **Near-noop** to a Franklin `NotificationAPI` or `ctx.ui.notify()`. |
| **Custom panel opening** | ⚠️ **Requires a Franklin equivalent of `ctx.ui.custom()`**. If Franklin provides this as part of its `ExtensionUIContext`, transpilation is a one-liner. If not, Franklin must add it. |
| **Connection callbacks** | ✅ **Stateless logic**. Reusable; just wire to Franklin's server manager. |
| **OAuth provider** | ✅ **MCP SDK integration**. No UI; fully reusable. |
| **Glimpse native windows** | ⚠️ **Electron-specific**. Keep as optional feature; not a blocker. |

**Key blocker:** Franklin **must support a `ctx.ui.custom()` equivalent** (or similar "render a stateful component, get back a result" API) for the panel to work without rewriting its 740 LOC from scratch. If Franklin only has `select/confirm/input`, the panel cannot be ported; it would need a complete redesign.

**Recommended approach:**
1. Extract `mcp-panel.ts` + `ui-resource-handler.ts` + `mcp-oauth-provider.ts` to a reusable `@franklin/mcp-adapter-core` package.
2. In Franklin's adapter, import the panel and wire `ctx.ui.custom()` (or whatever Franklin's equivalent is) in `commands.ts`.
3. Keep or drop `glimpse-ui.ts` based on Electron support.
4. The MCP-UI iframe ecosystem works unchanged in any webview-capable host.
