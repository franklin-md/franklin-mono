# pi-mcp-adapter Transpiler Reassessment — Synthesis

This synthesis is based on five independent sub-agent memos in this folder (no agent saw another's output), plus a coordinator spot-check of the adapter's LOC (`wc -l *.ts` → 9,417 lines across 36 TS files) and Pi-API call density (52 `pi.*`/`ctx.*` call sites concentrated in 4 files) on 2026-04-20.

Subject: a single real, published Pi extension — `pi-mcp-adapter` — not the Pi ecosystem in aggregate. Goal: find out whether a *real* adapter clears Franklin's current bar, and what specifically blocks it.

## Headline

The adapter uses **5 of the 6 Pi API families** (everything except provider/model). Of its ~9.4k LOC, only tool registration (≈20–25%) transpiles cleanly onto Franklin today. The other 75–80% needs a mix of new primitives and transpiler shims. The blockers split cleanly into two groups:

- **Integration-surface blockers** (small LOC, large unblock): session-lifecycle events, CommandAPI, FlagAPI, turn-injection. Each is ~50–150 LOC inside the adapter but unlocks most of it.
- **Side-effect / UI-mount blockers** (large LOC, all-or-nothing): process-lifetime OAuth callback server, and `ctx.ui.custom`-style mountable panel. Either Franklin grows the slot or the feature is dropped; there's no middle ground.

The adapter is a better transpiler stress-test than the 68 `pi-mono/examples/` extensions combined — it exercises nearly every family in one codebase and leans hard on two patterns (process-lifetime side-effects; stateful custom UI component) that the existing pi-extensions reassessment under-weighted.

## What the adapter is doing

From [01-adapter-inventory.md](01-adapter-inventory.md):

- One proxy tool (`mcp`) plus dynamically-registered direct tools drawn from an on-disk metadata cache.
- Lazy, eager, or keep-alive MCP server lifecycle, with idle-timeout reaping and health-check reconnect.
- OAuth 2.1 support with auto-discovery, dynamic client registration, and a local callback HTTP server.
- Interactive TUI panel (`mcp-panel.ts`, 740 LOC) served via `ctx.ui.custom` for per-server tool toggling.
- An iframe-based "MCP UI resource" relay (host HTML page + `app-bridge.bundle.js` + CSP + PostMessage) for MCP servers that ship their own UI.
- Session-scoped state with process-scoped OAuth and callback server, coordinated by a `lifecycleGeneration` counter.

Pi API surfaces touched (15 distinct):
- **Registrations (5)**: `registerTool` (proxy + direct), `registerFlag("mcp-config")`, `registerCommand("mcp")`, `registerCommand("mcp-auth")`.
- **Events (2)**: `session_start`, `session_shutdown`.
- **Imperative (4)**: `getAllTools`, `sendMessage`, `getFlag`, `exec`.
- **Context (5)**: `hasUI`, `ui.notify`, `ui.setStatus`, `ui.custom`, `ui.theme.fg`.

## What Franklin already handles cleanly

From [02-franklin-mapping.md](02-franklin-mapping.md):

- `pi.registerTool` ↔ `api.registerTool` — semantically identical. Spec + handler + runtime-context. This one surface covers proxy tool + direct tools ≈ 2.1k LOC of the adapter.
- Runtime-context-for-handlers model. Both pass a runtime object in; both bind at compile time. The algebra is the same.
- Metadata cache / config loading / MCP-server subprocess management — all ~1.4k LOC that happens to touch no Pi API and would port unchanged.

## What Franklin lacks today

| Family | Missing in Franklin | Adapter LOC depending on it |
|---|---|---|
| **Command registration** | No `registerCommand`; no slash-command dispatch. | ~250 LOC (the two `/mcp` + `/mcp-auth` handlers) |
| **Flag registration** | No `registerFlag` / `getFlag`; config comes through `DependencyRuntime`, not compile-time flags. | ~80 LOC |
| **Session lifecycle events** | No `session_start` / `session_shutdown` hook on `CoreAPI` or `SessionAPI`. | ~120 LOC (the two top-level handlers) that gate everything else. |
| **Process-lifetime extension scope** | No way for an extension to own a port or an HTTP server across session boundaries within a single process. | OAuth callback server (~800 LOC), `lifecycleGeneration` coordination. |
| **Message/turn injection** | No `sendMessage` / `injectUserMessage` from an extension; tools can return results, but cannot push a synthetic user turn. | ~150 LOC (UI-session → agent prompt handoff). |
| **Tool-registry introspection** | No `getAllTools` from an extension body — registry is compile-time-opaque. | ~50 LOC. |
| **UI notification / status** | No `ctx.ui.notify` / `setStatus`. Tools stream via ACP, but out-of-band notifications don't have a channel. | ~40 LOC of call sites (shimmable to noop). |
| **Mountable stateful UI component** | No `ctx.ui.custom(factory, { overlay })` ↔ blocks-for-result equivalent. | 740 LOC panel + 1.6k LOC iframe relay — only works at all if Franklin grows a mount slot. |

## Key findings (one per memo)

1. **The adapter touches 5 of 6 Pi API families in one file.** That's a much denser test of the compatibility surface than the pi-mono example corpus, where a typical extension touches 2–3 families. (Tesla)

2. **Only `registerTool` maps cleanly.** Every other surface — command, flag, lifecycle, notification, status, panel, turn-injection, getAllTools — is absent in Franklin today. Curie's mapping table is a clean gap list: 12 rows, 11 rows marked "no equivalent". (Curie)

3. **The MCP panel's 740 LOC is portable Pi-TUI code; the blocker is the mount slot.** `mcp-panel.ts` plus `host-html-template.ts` plus `ui-resource-handler.ts` — about 1.3k LOC — are host-agnostic and re-usable as-is. What Franklin doesn't have is the `ctx.ui.custom(factory) → Promise<Result>` contract that *mounts* a stateful component and blocks until dismissed. `confirm`/`select`/`input` cannot stand in — the panel has cursor state, search, keybindings, live status polling. (Faraday)

4. **The OAuth callback server is process-scoped, not session-scoped.** This is the subtlest finding. Franklin today assumes extensions are compile-time declarations; runtime side-effects live per session. But the adapter binds a port at process init, keeps it across session restarts, and tears it down on process exit. That lifetime does not exist in Franklin's extension model at all — it's not just a missing event, it's a missing *scope*. (Kepler)

5. **The "transpiles today" LOC count is optimistic without the mount-slot question resolved.** Hubble's "45% transpiles today" reflects the proportion of adapter code that isn't Pi-bound (MCP protocol, OAuth flow, config parsing). But that code can only *execute* if session-start runs and the extension can persist state — which requires lifecycle hooks. The honest "runs-in-Franklin-today" number is closer to 20–25%, matching Curie's mapping. (Hubble + coordinator reconciliation)

## Decision matrix

| Concern | Fold / Split? | Reuse code? | New Franklin primitive needed? | Adapter LOC unblocked |
|---|---|---|---|---|
| Tool registration | Already handled | Re-use Franklin's | None | ~2,100 |
| Flag registration | **New, trivial** | Rebuild | `api.registerFlag(name, spec)` + `getFlag` on runtime | ~80 |
| Command registration | **New family** | Don't reuse Pi's TUI-coupled code | `CommandAPI` (host-neutral, registration-only, matching `CoreRegistrar` pattern) | ~250 |
| Session-start/shutdown | **Raise above `SessionAPI`** to a manager/collection event surface — consistent with the pi-extensions reassessment's conclusion | Copy `CoreRegistrar` pattern | `on("sessionStart" \| "sessionShutdown")` on a higher-level surface | ~120 + unblocks most of the rest |
| Process-lifetime scope (OAuth server) | **New, structural** | N/A | Extension lifecycle hooks (`onExtensionStart` / `onExtensionShutdown`) distinct from session lifecycle | ~800 (OAuth callback + related) |
| Turn injection (`sendMessage`) | **Fold into mini-acp** | N/A | Reverse-RPC or runtime method that posts a synthetic user message and triggers a turn | ~150 |
| Tool-registry introspection | **Fold into `CoreRuntime`** | N/A | `runtime.listTools()` returning descriptors | ~50 |
| `ctx.ui.notify` / `setStatus` | **Stub today, proper InteractionAPI later** | N/A (protocol-level channel) | Noop shim is safe; a proper `notify` channel needs reverse-RPC | ~40 |
| Custom stateful panel | **Fundamentally a host-mount primitive** | The panel *component* is reusable; the *slot* is the hole | `ui.mount(factory) → Promise<Result>` — either TUI-style blocking, or webview-iframe-style | ~1,300 (panel + iframe relay) |

## Transpiler coverage ladder

Using Hubble's staged estimate, lightly reconciled against Curie's mapping:

- **Today, no shim, no new primitives**: ~10–20% of the adapter can be compiled at all. Tool registration works; everything gated behind `session_start` does not initialize.
- **Add session-start/shutdown events**: jumps to ~35%. Direct tools work; metadata cache loads; no UI, no turn injection.
- **+ `sendMessage` turn injection**: ~45%. UI sessions can extract prompts and feed the agent loop; mode switches work.
- **+ `CommandAPI` + `FlagAPI`**: ~55–60%. `/mcp` and `/mcp-auth` become real.
- **+ process-lifetime extension hooks (OAuth callback server)**: ~70%. OAuth auth flow fully works across sessions.
- **+ a mountable custom-panel primitive (or webview slot)**: ~80–85%. Interactive server panel and MCP-UI iframe relay functional.
- **Remaining gap at 100%**: Pi-TUI-specific details (`glimpse-ui.ts` macOS native window, TUI-only theme/keybinding fidelity) — never going to be 1:1, and not worth chasing.

Without a mount-slot primitive, the ceiling is ~65% — and the most visible feature of the extension (the interactive panel) is not available.

## Suggested build sequence (if pursuing this)

1. **Session-lifecycle events on a manager surface.** Smallest primitive, largest coverage jump (roughly 15 → 35%). Consistent with what the pi-extensions reassessment concluded independently.
2. **`FlagAPI` + `CommandAPI` together.** Both are registration-only registrars sharing the `CoreRegistrar` shape. Host owns invocation. ~40 LOC of new API code, ~350 LOC of adapter unblocked.
3. **`runtime.sendMessage({ text, triggerTurn })`.** Reverse-RPC on mini-acp or a runtime method. Small, but touches the wire protocol — do before UI primitives so the panel's "open / submit → triggers a turn" path works.
4. **Extension-lifetime hooks (`onExtensionStart` / `onExtensionShutdown`).** Required for the OAuth callback server. This is the one genuine structural change — a new scope in Franklin's algebra, not just a new event.
5. **`ui.mount` / custom-panel primitive.** Either the TUI-style blocking-for-result shape, or a webview mount point. Host owns implementation. This is the single largest LOC unlock (~1.3k) but the hardest decision about Franklin's UI boundary.

Steps 1–3 stay within `@franklin/extensions` + `@franklin/mini-acp`. Step 4 is a structural addition to the extension algebra. Step 5 crosses into the host/harness contract — defer until the UI boundary decision is explicit.

## Behavioural traps for a naive shim

From Hubble, worth preserving because they'll bite any transpiler author:

1. **`session_start` timing**: Pi fires it once per session. A Franklin equivalent that fires per-turn would make the adapter reload metadata every turn.
2. **Turn-injection side effects**: `sendMessage` goes into the current turn's history; Franklin's turn model is immutable mid-turn. A shim that appends to "next turn" silently breaks UI handoff.
3. **`ctx.ui.custom` blocking**: the adapter `await`s it. A non-blocking shim returns immediately and panel changes are lost.
4. **`lifecycleGeneration` assumption**: depends on `session_start` / `session_shutdown` pairing. If Franklin's lifecycle has different concurrency (e.g., forks), the generation counter's invariants break silently.
5. **`setInterval` for health checks**: the adapter schedules 30s reconnect checks. If Franklin GCs timers on session boundaries, connections leak.

## Bottom line

The adapter is a useful forcing function. It proves three things the earlier pi-extensions reassessment argued more abstractly:

1. **Commands and flags are worth a new Franklin family each** — they show up in a single real extension, with known LOC, and a shim is mechanical.
2. **Session lifecycle events belong above `SessionAPI`** — the adapter needs `start`/`shutdown` hooks that are *not* forkable and are *not* per-runtime-closure. The pi-extensions reassessment already argued this on different evidence; the adapter confirms it.
3. **There is a third scope that Franklin does not have today: extension-lifetime (process-scope).** This is new. The pi-extensions reassessment didn't surface it because no single example in the 68-example corpus binds a port at extension load. The adapter does, and it's not expressible in Franklin.

If Franklin lands (1) and (2), the adapter is ~60% transpilable and most of what remains is UI. If Franklin also lands (3) and grows a mount slot, the adapter is a realistic target for a compatibility shim. Without (3), the adapter's OAuth story cannot survive — and OAuth is increasingly mandatory for production MCP servers, so this isn't optional for real-world ecosystem coverage.

Put differently: the adapter isn't a 22% transpiler story like the toy examples. It's a 65–85% transpiler story, *if* the structural questions about extension scope and UI mounting get answered. If they don't, it's stuck around 35%.
