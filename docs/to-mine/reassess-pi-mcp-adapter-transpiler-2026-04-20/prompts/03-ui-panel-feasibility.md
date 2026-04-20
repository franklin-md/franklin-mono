Agent: `Faraday`

You are analysing the UI layer of `pi-mcp-adapter` to decide how much of it can live in a protocol-level extension model (like Franklin's) and how much is Pi-TUI-bound. Do not read `.context/attachments` or `.context/algebra`.

Inputs:
- `.context/external/pi-mcp-adapter/mcp-panel.ts` — the interactive "MCP panel" served from the extension.
- `.context/external/pi-mcp-adapter/host-html-template.ts` — bundled HTML template for the panel.
- `.context/external/pi-mcp-adapter/ui-resource-handler.ts` — handling of MCP "UI resources".
- `.context/external/pi-mcp-adapter/commands.ts` — how `openMcpPanel` is wired.
- `.context/external/pi-mcp-adapter/glimpse-ui.ts`, `mcp-oauth-provider.ts` — peripheral UI integrations.
- `.context/external/pi-mcp-adapter/app-bridge.bundle.js` (do NOT read the whole bundle — just `wc -l` to confirm size and skim the first 120 lines to understand what it is).
- Franklin's README and any docs on its approach to UI (`packages/extensions/README.md`, `packages/react/README.md` if it exists, `packages/electron/README.md` if it exists). You may also skim the demo package at `packages/demo/` to see how Franklin surfaces custom views.

Answer:

1. **What is the MCP panel architecturally?** Is it a TUI overlay via `ctx.ui.custom`, an HTML document served to a local webserver, or both? Describe the rendering stack used (host HTML page + bundled JS app bridge + iframe-based MCP UI resources?).
2. **What semantic operations does the panel need from the host?** List them as a host↔panel interface (e.g., "host can: open panel modal, stream status updates, return selection, close on commit"; "panel can: fetch current server list, request reconnect, toggle direct tools per server, etc."). This should describe the panel's contract, not its implementation.
3. **What about the `UiResource` / MCP-UI side?** Some MCP servers ship a HTML UI resource to the client (`chrome_devtools_take_screenshot` and similar). The adapter has code in `ui-resource-handler.ts` and `ui-stream-types.ts` to surface these resources, load them in an iframe, and relay messages. This is an MCP feature, not a Pi one — is it host-agnostic?
4. **The `ctx.ui.custom` calls in `commands.ts`.** Are these renderable in anything other than a Pi-TUI harness? If Franklin grew an interaction primitive (`confirm`, `select`, `input`, `editor`) or a webview-anchored panel API, which parts of the panel could be rewritten in terms of them, and which parts genuinely need a webview (iframe + CSP + postMessage) because of MCP-UI constraints?
5. **Estimated LOC to replace.** Approximate how many lines of the adapter's UI would be:
   - drop-in against a `notify/status/setStatus` abstraction (should be noop or near-noop to transpile),
   - rewritable against an `InteractionAPI` style surface (confirm/select/input),
   - fundamentally tied to the Pi-TUI `ctx.ui.custom` interface or to a webview panel model (not transpilable without that surface).

Keep it under 1000 words. Cite files with line numbers where it helps. Do not propose new Franklin API families — just report what would or would not work.
