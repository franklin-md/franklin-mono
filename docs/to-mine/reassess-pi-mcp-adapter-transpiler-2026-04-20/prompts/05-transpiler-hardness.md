Agent: `Hubble`

You are estimating the hardness of transpiling `pi-mcp-adapter` onto Franklin, as a single-extension case study. Do not read `.context/attachments` or `.context/algebra`. Do not read the other reports in this folder yet (they will be written in parallel) — produce an independent assessment from source.

Inputs:
- `.context/external/pi-mcp-adapter/` — the full cloned extension.
- Franklin-side source: package READMEs + `packages/extensions/src/`, `packages/mini-acp/src/`, `packages/agent/src/`.

Produce a memo with:

1. **High-level categorization.** For each major concern of the adapter — proxy tool registration, direct tool registration, flag registration, slash commands, session_start/_shutdown lifecycle, OAuth bootstrap, metadata cache flush/load, the MCP panel UI, the MCP-UI iframe relay, `pi.sendMessage` turn-injection, `pi.exec` for opening browser URLs, `pi.getAllTools` tool introspection — classify as:
   - **Transpiles today** (Franklin covers this).
   - **Transpiles with a thin shim** (we can fake it without new Franklin primitives).
   - **Requires a new Franklin primitive** (structural gap).
   - **Fundamentally incompatible** (would never make sense in Franklin's model, e.g., Pi-TUI-only interactions that assume a terminal UI).
2. **Line-of-code estimate per bucket.** Roughly, of the adapter's ~9k TS LOC (see `wc -l *.ts`), how many lines fall into each bucket?
3. **Ranked blockers.** What are the top 3–5 blockers preventing this extension from running on Franklin? Order them by how many LOC or how much adapter behaviour they unblock.
4. **Suggested transpiler strategy.** If someone wanted to implement a PIExtension transpiler in Franklin specifically for this adapter, what is the minimum it would have to do? Separate:
   - Franklin API additions (actual new primitives).
   - Transpiler runtime shim (fake `ctx` / fake command/flag registrars / fake UI).
   - Rewriting (lines that just have to be changed because the shape differs).
5. **Transpiler coverage estimate.** If we land only the shim, what percentage of the adapter works? If we add the top blocker, how does the percentage move? Give a ladder.
6. **Risk of drift.** Even with a shim, the adapter depends on specific Pi semantics (e.g., `session_start` fires once, `sendMessage` triggers a turn, `ctx.ui.custom` blocks until dismissed). List the behavioural traps where a naive shim silently diverges and tests pass but runtime breaks.

Keep it under 1100 words. No recommendations about whether to build the transpiler — just feasibility and sizing. Be concrete. Cite files.
