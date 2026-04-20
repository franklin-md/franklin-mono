# PI Extensions Transpiler Reassessment

This synthesis is based on the six independent memos in this folder, plus a coordinator spot-check of public web sources on 2026-04-20.

## Headline

The old summary was directionally right about the big missing families, but it blurred three important distinctions:
- Franklin’s current compile-time extension surface is even smaller than the old summary implied.
- Pi’s real extension usage is dominated by commands, lightweight user interaction, session-start reconstruction, and tool overrides, not by the deepest lifecycle hooks.
- Session lifecycle and compaction should not be folded into `SessionAPI` the way the previous discussion suggested. They belong above it.

## What Franklin actually has today

From [01-franklin-inventory.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/reassess-pi-extensions-transpiler-2026-04-20/reports/01-franklin-inventory.md):
- Compile-time extension API is basically `CoreAPI.on(...)` over 8 events plus `registerTool(...)`.
- `StoreAPI.registerStore(...)` exists.
- Environment and session capabilities are runtime-only on `ctx`, not compile-time registrars.
- Mini-ACP only gives you `initialize`, `setContext`, `prompt`, `cancel`, and reverse-RPC `toolExecute`.

That means Franklin is currently strong at:
- Tool registration and interception around prompt/tool/result flow.
- Shared app-owned state via stores.
- Runtime access to environment/session handles once a system is installed.

It is currently weak or absent at:
- Command/shortcut/flag registration.
- Public lifecycle events outside the core 8 hooks.
- Standard user-interaction primitives.
- History inspection/manipulation beyond tracked message state.
- Any portable renderer/UI slot model.
- Provider/model interception and custom message rendering.

## What Pi extensions are actually using

From [02-pi-inventory.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/reassess-pi-extensions-transpiler-2026-04-20/reports/02-pi-inventory.md):
- Pi exposes 28 event names, 6 registration families, broad action/state methods, and a large `ctx.ui`.
- Across 68 example entrypoints:
  - `registerCommand` appears in 31 files.
  - `registerTool` appears in 18 files.
  - `session_start` appears in 19 files.
  - `ctx.ui.notify` appears in 38 files.
  - `ctx.ui.custom` appears in 15 files.
  - `ctx.ui.setStatus` appears in 9 files.
  - `ctx.ui.select` appears in 8 files.
  - `ctx.ui.confirm` appears in 5 files.

This matters because it changes the prioritization. The most leverage is not in chasing every Pi event. The leverage is in:
1. Commands
2. Session-start style lifecycle
3. Lightweight interaction UI
4. Appendable/queryable history
5. Tool override/interception

## Public ecosystem check

From [03-public-ecosystem-survey.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/reassess-pi-extensions-transpiler-2026-04-20/reports/03-public-ecosystem-survey.md), and coordinator web spot-checks:
- The public Pi ecosystem is wider than the example corpus alone suggests.
- Real public packages are using Pi extensions to:
  - override core tools
  - build approval/questionnaire flows
  - ship provider adapters
  - build subagent orchestration layers
  - package product-like bundles with status lines, dashboards, prompts, and workflows

That means a transpiler is not just about “can we run toy examples?” It is about whether Franklin wants to host a programmable product layer.

## Updated architecture conclusions

### 1. Command API

From [04-command-reuse.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/reassess-pi-extensions-transpiler-2026-04-20/reports/04-command-reuse.md):
- Pi has a small reusable registry/resolution kernel.
- Most of the implementation is still entangled with TUI types, keybindings, and session/UI context.
- Reusing the ideas is sensible; reusing the code is not.

Updated recommendation:
- Add a separate `CommandSystem` to Franklin.
- Keep it registration-only and host-neutral.
- Let the harness own parsing, palette/completion UI, and actual keyboard dispatch.

This is probably the single highest-leverage new family because command registration is the most common Pi extension pattern in the example corpus.

### 2. UI split

From [05-ui-mapping.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/reassess-pi-extensions-transpiler-2026-04-20/reports/05-ui-mapping.md):
- `confirm`, `select`, `input`, and `editor` are interaction primitives.
- `notify`, `setStatus`, `setWidget`, `setTitle`, `theme`, editor text helpers, and similar methods are presentation primitives.
- `custom`, header/footer/editor replacement, raw terminal input, and component-backed widgets are renderer-only.

Updated recommendation:
- Model interaction as a host-mediated request/response surface.
- This could be a dedicated reverse-RPC in Mini-ACP, or it could initially be represented as app-owned tools. The important point is architectural: it is host-mediated interaction, not Pi-style TUI exposure.
- Keep presentation state separate from interaction. `StoreAPI` is the natural bridge for app-owned UI state.
- Do not try to make renderer-specific APIs portable.

### 3. Session lifecycle

This is where the new reassessment most clearly diverges from the previous one.

From [06-session-history.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/reassess-pi-extensions-transpiler-2026-04-20/reports/06-session-history.md):
- Franklin already treats session behavior as runtime-local and collection/persistence as higher-level concerns.
- Pi also splits session identity/management from top-level lifecycle observation.

Updated recommendation:
- Do not put lifecycle registration on `SessionAPI`.
- Keep `SessionAPI` imperative and local to a runtime.
- Add lifecycle observation on a manager/collection/app event surface parallel to `CoreAPI.on(...)`.

If you need cancellable `beforeFork` or `beforeSwitch` semantics later, add them to that higher-level lifecycle surface, not to `SessionAPI` itself.

### 4. History and compaction

Also from [06-session-history.md](/Users/afv/conductor/workspaces/franklin/yangon-v2/.context/reassess-pi-extensions-transpiler-2026-04-20/reports/06-session-history.md):
- The true minimum history primitive set is small: canonical ordered messages, a system prompt value, and snapshot/replace/append/clear semantics.
- Compaction should be a projection over history before model invocation, not a built-in history primitive.

Updated recommendation:
- Add a small history surface above Mini-ACP state tracking.
- Keep canonical history separate from model-facing transformed history.
- Implement compaction as a pre-prompt materialization step or decorator, not as a first-class history mutation protocol.

## Revised transpiler hardness estimate

Conservative planning estimate:
- Today, Franklin likely only supports a low-teens to low-twenties percentage of Pi example patterns without significant shimming. The main reason is simple: there is no compile-time command surface, no standard interaction API, and no public lifecycle/history layer.
- If Franklin adds:
  - a host-neutral `CommandSystem`
  - a host-mediated interaction surface
  - a higher-level lifecycle event surface
  - a small history API with pre-prompt compaction/projection
  then a transpiler can plausibly cover most command/tool/stateful examples and some UI-driven examples.

My updated estimate is:
- Reasonable near-term ceiling: about 60-70% of the Pi example corpus.
- Stretch ceiling: low 70s if you are willing to no-op or host-shim some presentation UI.
- Hard incompatible bucket remains:
  - custom TUI/overlay/component extensions
  - message renderers
  - provider registration and provider-payload interception
  - editor replacement
  - anything that assumes direct renderer objects or terminal input

This is slightly more conservative than the earlier 75-80% framing because the new example counts show how often commands and UI are entangled, and the new session/history analysis argues against one of the previous simplifications.

## Practical build order

1. Add `CommandSystem`.
2. Add interaction primitives for `confirm` / `select` / `input` / `editor`.
3. Add higher-level lifecycle events above session runtime handles.
4. Add minimal history read/write/projection support.
5. Only then evaluate whether provider/model and renderer families are worth exposing.

## Bottom line

Building a Pi-extension transpiler for Franklin still makes sense, but the right target is narrower and cleaner than the old summary suggested:
- copy Pi’s architectural ideas, not its command/UI code
- keep renderer concerns out of the portable core
- keep lifecycle above `SessionAPI`
- keep compaction above history

If Franklin adopts those seams first, the transpiler becomes a plausible compatibility layer. If it does not, the transpiler will mostly become a pile of special cases around commands, prompts, and state reconstruction.

