# pi-mcp-adapter Transpiler Reassessment

Assessment of whether the [pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter) extension — a real, published Pi extension that turns MCP servers into on-demand tools via a proxy tool pattern — could be transpiled onto Franklin's extension runtime.

Mirrors the methodology used in `../reassess-pi-extensions-transpiler-2026-04-20/`:
- Independent sub-agents launched with no forked conversation context.
- Each explicitly told not to read `.context/attachments` or `.context/algebra` to avoid inheriting prior summaries.
- Each explicitly pointed at `.context/external/pi-mcp-adapter/` (the fresh clone).
- Exact prompts stored under `prompts/`.
- Raw outputs stored under `reports/`.
- A synthesized conclusion is in [reports/00-synthesis.md](reports/00-synthesis.md).

Subject of study: a single concrete extension (not the Pi surface in aggregate). The goal is to discover whether a *real* published adapter — with proxy tools, OAuth, session-lifecycle, custom UI panel, and flag/command registration — clears Franklin's current bar, and what specifically blocks it.

Index:
- [prompts/01-adapter-inventory.md](prompts/01-adapter-inventory.md)
- [prompts/02-franklin-mapping.md](prompts/02-franklin-mapping.md)
- [prompts/03-ui-panel-feasibility.md](prompts/03-ui-panel-feasibility.md)
- [prompts/04-lifecycle-oauth.md](prompts/04-lifecycle-oauth.md)
- [prompts/05-transpiler-hardness.md](prompts/05-transpiler-hardness.md)
- [reports/01-adapter-inventory.md](reports/01-adapter-inventory.md)
- [reports/02-franklin-mapping.md](reports/02-franklin-mapping.md)
- [reports/03-ui-panel-feasibility.md](reports/03-ui-panel-feasibility.md)
- [reports/04-lifecycle-oauth.md](reports/04-lifecycle-oauth.md)
- [reports/05-transpiler-hardness.md](reports/05-transpiler-hardness.md)
- [reports/00-synthesis.md](reports/00-synthesis.md)
