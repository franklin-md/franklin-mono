Public web survey as of April 20, 2026; I did not use local summaries. My read from the material below: Pi’s extension ecosystem is heavily TypeScript-first and practice clusters around three patterns: tool/command augmentation, TUI/UI customization, and provider/runtime adapters.

- Official extension docs (`pi-mono`): the clearest public map of what extensions can do in practice: lifecycle hooks, `registerTool`, `registerCommand`, `ctx.ui.confirm/select/input`, custom tool/message renderers, custom editors, remote tool operations, and truncation helpers. Source: <https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md>

- Official `todo.ts` example: demonstrates a full LLM-callable tool plus a user slash command, custom rendering, and state reconstructed from session history. It is a good reference for `tool + command + persistent state` as an extension pattern. Source: <https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/todo.ts>

- Official compaction examples: `custom-compaction.ts` shows replacing default compaction with a model-generated structured summary of the whole conversation; `trigger-compact.ts` shows automatic compaction when context crosses 100,000 tokens plus a `/trigger-compact` command. Sources: <https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/custom-compaction.ts> and <https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/trigger-compact.ts>

- `rytswd/pi-agent-extensions`: a practical bundle showing common everyday extensions. Notable patterns: `permission-gate` intercepts dangerous bash commands and prompts for confirmation with a free-text rejection reason; `questionnaire` provides tabbed multi-question UI with custom chat-history rendering. Source: <https://github.com/rytswd/pi-agent-extensions>

- `xRyul/pi-nvidia-nim`: a concrete custom-provider extension. It uses `pi.registerProvider()`, wraps Pi’s OpenAI-compatible streaming path, maps Pi thinking levels onto NIM’s nonstandard parameters, auto-discovers models, and keeps tool calling working. Source: <https://github.com/xRyul/pi-nvidia-nim>

- `coctostan/pi-hashline-readmap`: strong evidence that people use extensions to override Pi’s core tools rather than only add new ones. It replaces `read`/`edit`/`grep`/`ls`/`find`, adds `ast_search` and `nu`, introduces hash-anchored edits and structural file maps, compresses noisy bash output, and adds custom TUI badges/rendering. Source: <https://github.com/coctostan/pi-hashline-readmap>

- `nicobailon/pi-subagents`: shows Pi extensions being used as orchestration layers. It adds `/run`, `/chain`, `/parallel`, and `/subagents-status`; supports async/background runs, configurable output truncation, artifacts, live overlays, and optional session sharing via Gist-backed exports. Source: <https://github.com/nicobailon/pi-subagents>

- `pi0/pi-vscode`: demonstrates an editor-integration extension that exposes live IDE state and edit operations back to Pi as tools. It also ships package-management UX for Pi packages and commands like `Open with File`, which suggests extensions are being used as workflow bridges, not just in-terminal add-ons. Source: <https://github.com/pi0/pi-vscode>

- `ifiokjr/oh-pi`: a large real-world extension bundle. Particularly relevant patterns: `/external-editor`, persisted usage/rate-limit history with a widget and `/usage` dashboard, adaptive routing, and multi-agent orchestration. This is one of the clearest examples of `extension as product layer`. Source: <https://github.com/ifiokjr/oh-pi>

- Joel Hooks’ post on custom tools/widgets: useful because it documents an opinionated extension design pattern from outside the official repo: tools for actions, widgets for persistent visual state, and custom messages for results; it also shows npm packaging via the `pi.extensions` field. Source: <https://joelclaw.com/extending-pi-with-custom-tools>

Overall, the public material suggests Pi extensions are being used less like small plugins and more like a programmable agent harness: people override core tools, add approval/UI flows, compact history, register providers, and build custom renderers/overlays around long-running workflows.

Coordinator spot-check on 2026-04-20:
- Official docs present at <https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md>.
- `rytswd/pi-agent-extensions` present at <https://github.com/rytswd/pi-agent-extensions>.
- `nicobailon/pi-subagents` present at <https://github.com/nicobailon/pi-subagents>.
- `ifiokjr/oh-pi` present at <https://github.com/ifiokjr/oh-pi>.

