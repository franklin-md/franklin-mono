Agent: `Tesla`

You are doing an independent source-based inventory of the `pi-mcp-adapter` extension's use of Pi's extension API. Do not read any files under `.context/attachments` or `.context/algebra`, and do not infer from previous summaries. The adapter has been cloned to `.context/external/pi-mcp-adapter/`.

Read `README.md`, `index.ts`, `types.ts`, and enough of the supporting `.ts` files (`init.ts`, `commands.ts`, `mcp-panel.ts`, `proxy-modes.ts`, `direct-tools.ts`, `lifecycle.ts`, `mcp-auth-flow.ts`, `ui-resource-handler.ts`) to produce an accurate catalog.

Produce a concise memo with:

1. **What the extension does at a high level** — one paragraph. What is the proxy tool pattern? What does "direct tools" mean? What are UI resources?
2. **Full catalog of Pi API surfaces touched**, organized by family, each with file:line citations. Include:
   - Every `pi.*` registration call (tool, command, flag, shortcut, provider, messageRenderer, etc.).
   - Every `pi.on(...)` event subscription.
   - Every `pi.*` imperative action (`sendMessage`, `exec`, `getAllTools`, `setModel`, `setActiveTools`, etc.).
   - Every `ctx.*` method used inside handlers (UI calls, `sessionManager`, `cwd`, `hasUI`, etc.).
   - Every external dependency it imports from Pi (`@mariozechner/pi-coding-agent`, `@mariozechner/pi-ai`, etc.) along with the symbols imported.
3. **Counts** — how many distinct Pi-API entry points are touched, categorized by family. This helps sizing.
4. **The "unusual" surfaces** — anything that is rare across the 68 pi-mono examples but used heavily here (e.g., tool introspection via `getAllTools`, proxy tools that spawn more tools lazily, HTML UI resources bundled into the extension, `ctx.ui.custom` usage).
5. **The extension's persistence/IPC model** — does it use Pi for state or does it have its own (file cache, local web server)? Does it spawn its own subprocesses (MCP servers via stdio), hold long-lived connections, or run any HTTP server on localhost?

Do not compare to Franklin. Do not propose changes. Do not speculate on transpilability. Keep it under 900 words.
