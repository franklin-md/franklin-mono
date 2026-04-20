Agent: `Curie`

You are mapping each Pi extension API surface used by `pi-mcp-adapter` onto Franklin's current extension surface. Do not read any files under `.context/attachments` or `.context/algebra`. Do not read `.context/reassess-pi-extensions-transpiler-2026-04-20/` either; produce an independent analysis.

Inputs:
- Pi-side source: `.context/external/pi-mcp-adapter/` (cloned extension). Focus on `index.ts`, `commands.ts`, `init.ts`, `lifecycle.ts`, `mcp-auth-flow.ts`. If helpful, also the Pi type exports it imports from `@mariozechner/pi-coding-agent`.
- Franklin-side source: read package READMEs first — `packages/extensions/README.md`, `packages/mini-acp/README.md`, `packages/agent/README.md` (whichever exist). Then inspect the public compile-time API in `packages/extensions/src/systems/`, and runtime APIs in `packages/agent/src/`, `packages/mini-acp/src/`.

Produce a concise memo with:

1. **Per-surface mapping table.** For each distinct Pi API the adapter uses (e.g., `pi.registerTool`, `pi.registerFlag`, `pi.registerCommand`, `pi.on("session_start")`, `pi.on("session_shutdown")`, `pi.sendMessage`, `pi.exec`, `pi.getAllTools`, `ctx.hasUI`, `ctx.ui.notify`, `ctx.ui.setStatus`, `ctx.ui.custom`, etc.), one row:
   - **Pi API** — the symbol.
   - **Franklin analog** — what in Franklin covers it today, if anything. Cite file paths.
   - **Gap** — precisely what is missing (no equivalent / missing semantics / missing event type / signature shape mismatch).
   - **Shimability** — trivial (noop), possible with a thin shim, requires new Franklin primitive.
2. **Categorical gaps.** Group the shortcomings: what families of Franklin API are absent? (E.g., command system, flag system, session-lifecycle event, UI notification/status, custom-panel UI, tool-registry introspection.)
3. **What Franklin already handles cleanly.** Do not be negative-only. Call out the surfaces that do map well — tool registration, `ctx`-style runtime access through extensions — and why.
4. **Semantic hazards.** Any places where a shim could be written but the semantics are subtly wrong? For example:
   - `pi.registerTool` inside the extension body vs a `session_start`-gated registration.
   - A `pi.on("session_start")` handler that expects to be called once per fresh session lifecycle.
   - `ctx.hasUI` checks threaded through handlers — is Franklin's equivalent model the same?
5. **Concrete file citations throughout.** I need pointers into both codebases.

Keep it under 1100 words. Focus on what is missing in Franklin today, not on what would be nice.
