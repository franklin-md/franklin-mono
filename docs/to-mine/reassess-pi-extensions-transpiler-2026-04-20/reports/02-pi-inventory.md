1. Public extension surface

Pi’s public extension API is centered on `pi.on(...)` plus a registration/action API. The typed surface in [types.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/types.ts:1006) exposes 28 event names across resource discovery, session lifecycle, agent/turn/message/tool execution lifecycle, model changes, user bash/input, and tool call/result interception [types.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/types.ts:1011). It also exposes registration methods for tools, commands, shortcuts, flags, message renderers, and providers [types.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/types.ts:1054), plus action/state methods like `sendMessage`, `sendUserMessage`, `appendEntry`, session metadata, `exec`, tool-set control, model/thinking control, and `events` [types.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/types.ts:1098).

The context side is broad: `ExtensionContext`, command-only `ExtensionCommandContext`, and a large `ctx.ui` surface for dialogs, notifications, widgets, header/footer/editor replacement, overlays, title/theme control, and editor text access [types.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/types.ts:109), [types.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/types.ts:266), [types.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/types.ts:301). The guide summarizes the same families at a higher level [extensions.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/extensions.md:5).

Behaviorally, the runner chains or short-circuits handlers in load order: `session_before_*` can cancel, `tool_call` can block, `context`/`before_provider_request`/`before_agent_start`/`input`/`tool_result` can transform state as they flow through extensions [runner.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/runner.ts:578), [runner.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/runner.ts:662), [runner.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/runner.ts:714), [runner.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/runner.ts:746), [runner.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/runner.ts:780), [runner.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/runner.ts:885). Discovery/loading supports project-local and global extension dirs, direct files, one-level subdirs with `index.ts`, and package manifests [extensions.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/extensions.md:7), [loader.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/loader.ts:423), [loader.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/loader.ts:511).

2. Usage patterns across examples

I scanned 68 example entrypoints under `.context/pi-mono-reference/examples/extensions` (top-level `.ts` files plus nested `index.ts` entrypoints).

Most common registrations:
- `registerCommand`: 31 files, 52 registrations
- `registerTool`: 18 files, 32 registrations
- `registerFlag`: 4 files
- `registerProvider`: 3 files
- `registerShortcut`: 2 files
- `registerMessageRenderer`: 2 files

Most common hooks:
- `session_start`: 19 files, 20 handlers
- `before_agent_start`: 6
- `session_shutdown`: 5
- `turn_start`: 4
- `turn_end`: 4
- `tool_call`: 4
- `session_before_switch`: 3
- `session_before_fork`: 3
- `session_tree`: 3
- `user_bash`: 3
- `input`: 2

Single-example hooks:
- `resources_discover`, `session_before_compact`, `context`, `before_provider_request`, `after_provider_response`, `model_select`, `tool_result`

No example entrypoint subscribes to:
- `session_compact`, `session_before_tree`
- `message_start` / `message_update` / `message_end`
- `tool_execution_start` / `tool_execution_update` / `tool_execution_end`

Most common UI/context methods:
- `ctx.ui.notify`: 38 files, 127 calls
- `ctx.ui.custom`: 15 files, 30 calls
- `ctx.ui.setStatus`: 9 files, 18 calls
- `ctx.ui.select`: 8 files
- `ctx.ui.confirm`: 5 files, 7 calls
- `ctx.ui.setEditorText`: 4 files, 6 calls
- `ctx.ui.editor`: 3 files
- `ctx.ui.setWidget`: 3 files, 5 calls

Sparse command/context control:
- `ctx.newSession`, `ctx.reload`, `ctx.shutdown`, `ctx.compact`, `ctx.getSystemPrompt`, `ctx.getContextUsage`: each appears in 1 file
- No example uses `waitForIdle`, `fork`, `navigateTree`, `switchSession`, `abort`, or `hasPendingMessages`

3. Central vs niche

Central capabilities, based on both docs and example density, are:
- Tool registration and built-in tool override/wrapping
- Slash-command driven UX
- `session_start`-based state reconstruction
- Pre-agent/tool interception (`before_agent_start`, `tool_call`)
- User-facing UI feedback (`notify`, `select`, `confirm`, `custom`, `setStatus`)
- Session persistence via `appendEntry` and tool activation control

Niche or lightly demonstrated capabilities are:
- Provider registration and custom transports
- Resource discovery
- Message renderers and inter-extension event bus
- Session metadata/labels
- Custom header/footer/editor/theme/title surfaces
- Direct session orchestration APIs
- Fine-grained lifecycle hooks for message streaming and tool execution, which are exposed but unrepresented in the example corpus

4. Concrete refs

Core surface: [extensions.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/extensions.md:5), [types.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/types.ts:109), [types.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/types.ts:1006), [runner.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/runner.ts:578), [loader.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/src/core/extensions/loader.ts:511).

Representative examples: [hello.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/examples/extensions/hello.ts:25), [permission-gate.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/examples/extensions/permission-gate.ts:13), [todo.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/examples/extensions/todo.ts:132), [tools.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/examples/extensions/tools.ts:67), [plan-mode/index.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/examples/extensions/plan-mode/index.ts:43), [dynamic-resources/index.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/examples/extensions/dynamic-resources/index.ts:8), [provider-payload.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/examples/extensions/provider-payload.ts:8), [custom-provider-anthropic/index.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/examples/extensions/custom-provider-anthropic/index.ts:569), [message-renderer.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/examples/extensions/message-renderer.ts:15), [question.ts](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/pi-mono-reference/examples/extensions/question.ts:37).

