# Memo 06: Pi-Mono, Franklin, and the Real API Surface

Scope:
- Franklin repo at `93d9eacb` (`2026-04-18`)
- `pi-mono` cloned to `/tmp/pi-mono` at `182d4ceea33beabe7c4712b04f1f5459e613de44` (`2026-04-18`)

This memo asks a narrower question than “what can pi do?”:

> At the harness/extension layer, how many distinct concerns actually exist, and how many of them require genuinely new APIs in Franklin rather than better parameterization of the ones we already have?

The short answer is:

- Pi does **not** have a small number of clean, orthogonal API families.
- It has **one large `ExtensionAPI`** plus a very broad event taxonomy, several registries, and a large amount of product-specific shell/UI surface.
- Franklin already captures some of the hardest reusable concerns more cleanly than pi does: `Core`, `Store`, `Environment`, `Session`, `Dependency`.
- If Franklin wants parity with a full coding harness like pi, it probably needs **4-6 more real API families**, but only **2-4** of them look fundamental at the middleware/runtime level.
- So the algebra is not overkill. If anything, it is currently buying separation that pi mostly does not have.

## 1. What Pi-Mono Actually Built

### 1.1 Load/discovery/distribution

Pi extensions are plain TS/JS modules discovered from:
- project `.pi/extensions/*`
- global `~/.pi/agent/extensions/*`
- explicit configured paths
- package manifests with `pi.extensions`

Source:
- `/tmp/pi-mono/packages/coding-agent/docs/extensions.md`
- `/tmp/pi-mono/packages/coding-agent/src/core/extensions/loader.ts`

This is a real subsystem, but it is mostly packaging/distribution, not algebra. The important point is that pi treats extensions as **runtime-loaded modules**, not typed algebraic terms.

### 1.2 Registration model

Pi’s core registration shape is:

```ts
export interface ExtensionAPI {
  on(event, handler): void
  registerTool(...): void
  registerCommand(...): void
  registerShortcut(...): void
  registerFlag(...): void
  registerMessageRenderer(...): void
  sendMessage(...): void
  appendEntry(...): void
  setSessionName(...): void
  setLabel(...): void
  exec(...): Promise<...>
  getActiveTools()/setActiveTools(...)
  getCommands()
  setModel()/getThinkingLevel()/setThinkingLevel()
  registerProvider()/unregisterProvider()
  events: EventBus
}
```

Source:
- `/tmp/pi-mono/packages/coding-agent/src/core/extensions/types.ts`
- `/tmp/pi-mono/packages/coding-agent/src/core/extensions/loader.ts`

This is not a family of algebras. It is a **large product API** with:
- hook registration
- tool registration
- UI/command registration
- imperative runtime actions
- model/provider registry mutation
- cross-extension communication

In Franklin terms, pi’s `ExtensionAPI` conflates:
- `CoreAPI`
- a command/input API
- a UI/presentation API
- a model/provider API
- a session metadata/history API
- a resource discovery API
- a dependency/event-bus API

### 1.3 Runtime context surface

Pi also exposes a large `ExtensionContext` / `ExtensionCommandContext`:

- UI dialogs and widgets
- editor replacement
- status/footer/header/title control
- current model and model registry
- session manager access
- context usage
- abort/shutdown
- compaction trigger
- current system prompt
- session switching/forking/tree navigation/reload

Source:
- `/tmp/pi-mono/packages/coding-agent/src/core/extensions/types.ts`
- `/tmp/pi-mono/packages/coding-agent/src/core/extensions/runner.ts`

This is important: pi’s extension system is not only “agent loop hooks.” It is a **whole application shell plugin system**.

## 2. Pi’s Real Subsystems

If you factor pi’s monolith by concern, I think the actual subsystems are:

1. `Loop Hooks`
- `before_agent_start`, `context`, `before_provider_request`, `after_provider_response`
- `agent_start/end`, `turn_start/end`, `message_*`, `tool_execution_*`
- `tool_call`, `tool_result`

2. `Tool Registry`
- custom tools
- active tool set
- prompt snippets/guidelines
- custom tool renderers
- dynamic tool registration after startup

3. `Session/History`
- `session_start`, `session_before_switch`, `session_before_fork`
- `session_before_compact`, `session_compact`
- `session_before_tree`, `session_tree`
- `appendEntry`, session naming, labels/bookmarks

4. `Input/Command Surface`
- `input`
- `user_bash`
- slash commands
- shortcuts
- flags

5. `UI/Presentation`
- notifications
- widgets
- overlays
- custom editor
- custom header/footer/title
- message renderers

6. `Model/Provider`
- `model_select`
- `setModel`, thinking level
- provider registration/unregistration
- payload/response hooks

7. `Resource Discovery`
- `resources_discover` for skills/prompts/themes

8. `Dependency / Bus`
- `pi.events`
- runtime-injected `ModelRegistry`, `SessionManager`, etc.

9. `Packaging / Reload`
- auto-discovery
- `/reload`
- queued provider registrations during load, then immediate updates post-bind

Pi has these concerns, but it does **not** represent them as separate typed algebras. They are flattened into one extension runtime.

## 3. Pi’s Phase Structure

Pi’s lifecycle is broad and explicit. The docs describe this order:

- session start/resource discovery
- input interception
- before-agent-start system prompt/message injection
- agent/turn/message lifecycle
- per-turn context mutation
- provider request/response interception
- tool preflight/execute/postprocess lifecycle
- session switching/forking/compaction/tree lifecycle
- model selection lifecycle
- shutdown lifecycle

Source:
- `/tmp/pi-mono/packages/coding-agent/docs/extensions.md`

This is valuable because it shows what the community has converged on as useful hook points:

- not just tool calls
- not just prompt mutation
- also input, compaction, tree navigation, model changes, provider payloads, UI, and session transitions

But algebraically, this is still mostly **one event bus with ad hoc return contracts**:
- block
- transform
- replace payload
- append message
- override system prompt
- custom compaction
- cancel switch/fork/tree

Pi solved breadth mostly by adding more event types, not by introducing better-typed API families.

## 4. Franklin’s Current Split

Franklin today is much narrower and cleaner:

### 4.1 Actual families

`FranklinAPI = CoreAPI & StoreAPI & EnvironmentAPI & SessionAPI`

Source:
- `packages/agent/src/types.ts`

With lower-level generic support for:
- `DependencyAPI<Name, T>`

Source:
- `packages/extensions/src/systems/dependency/api.ts`

### 4.2 What each family owns

`CoreAPI`
- prompt/cancel/system prompt hooks
- stream observation
- tool observation
- tool registration

`StoreAPI`
- state declaration and access

`EnvironmentAPI`
- access to the provisioned environment handle

`SessionAPI`
- child/fork/remove

`DependencyAPI`
- app-provided singleton/resource getter

Source:
- `packages/extensions/src/systems/core/api/api.ts`
- `packages/extensions/src/systems/store/api/api.ts`
- `packages/extensions/src/systems/environment/api/api.ts`
- `packages/extensions/src/systems/sessions/api/api.ts`

### 4.3 Immediate consequence

Franklin already isolates three things pi flattens together:

- loop/tool orchestration
- state/persistence/sharing
- environment localization/sandboxing

That is not over-engineering. That is exactly the kind of split pi’s API does not have.

## 5. Pi Concern -> Franklin Mapping

Here is the useful comparison.

### 5.1 Already covered well by Franklin

`Tool registration and tool lifecycle`
- Pi: `registerTool`, `tool_call`, `tool_result`, `tool_execution_*`
- Franklin: `CoreAPI.registerTool`, `on('toolCall')`, `on('toolResult')`
- Verdict: already the same concern. Franklin just has fewer lifecycle points.

`Prompt/system prompt/context shaping`
- Pi: `before_agent_start`, `context`
- Franklin: `on('prompt')`, `on('systemPrompt')`
- Verdict: mostly same concern, just different factoring.

`Shared extension state`
- Pi: `appendEntry`, session replay, ad hoc reconstruction, in-memory state in extensions
- Franklin: `StoreAPI`
- Verdict: Franklin is ahead here conceptually.

`Environment / remote / sandbox / SSH style localization`
- Pi: usually done in tools or extensions like `ssh.ts`, `sandbox/`
- Franklin: `EnvironmentAPI` and environment implementations
- Verdict: Franklin already has the right subsystem boundary.

`Session forking / child agents`
- Pi: session tree/fork/handoff/subagent patterns
- Franklin: `SessionAPI`
- Verdict: Franklin already has a real subsystem for this.

`Global dependencies`
- Pi: model registry, event bus, runtime services are injected into context/runtime
- Franklin: `DependencyAPI`
- Verdict: many of pi’s “extra APIs” are just dependency injection in disguise.

### 5.2 Missing in Franklin, but probably not new algebra

`Event bus`
- Pi: `pi.events`
- Franklin: this is almost certainly `DependencyAPI<'EventBus', EventBus>`
- Verdict: not a new API family.

`Model registry as an app singleton`
- Pi: injected runtime/model registry
- Franklin: likely `DependencyAPI<'ModelRegistry', ModelRegistry>`
- Verdict: not a new API family by itself.

`Auth/secrets/provider clients`
- Pi: provider config, OAuth, registry mutation
- Franklin: usually dependency injection
- Verdict: mostly `DependencyAPI`, unless Franklin wants first-class model/provider mutation hooks.

`Session naming / bookmarks / metadata`
- Pi: `setSessionName`, `setLabel`
- Franklin: could be `StoreAPI` plus app policy, or a small `SessionMetadataAPI`
- Verdict: maybe a convenience API, not obviously a deep new algebra.

### 5.3 Missing in Franklin, and probably real new families

`InputAPI`
- Pi has pre-agent user input interception, transformation, and handling:
  - `input`
  - `user_bash`
  - slash commands
  - shortcuts
  - flags
- Franklin has no equivalent because it currently starts at “agent runtime already exists”.
- Verdict: if Franklin wants to be a shell/harness, this is a real API family.

`UIAPI`
- Pi extensions can talk to the user and control the shell:
  - dialogs
  - widgets
  - editor replacement
  - header/footer/title
  - custom message renderers
- Franklin currently has no user-interaction algebra at all.
- Verdict: real API family, but only if Franklin wants to own an opinionated UI shell.

`ModelAPI`
- Pi has:
  - model selection lifecycle
  - thinking level mutation
  - provider registration/unregistration
  - provider payload/response hooks
- Franklin currently treats model config mostly as context/auth wiring.
- Verdict: if Franklin wants extension-level control of model/provider routing, this is a real family.

`HistoryAPI` or `CompactionAPI`
- Pi has explicit compaction/tree/session-transition hooks.
- Franklin has stores and sessions, but not a dedicated history-shaping/compaction algebra.
- Verdict: probably real if Franklin wants first-class history management beyond raw session fork/child.

`ResourceDiscoveryAPI`
- Pi extensions can contribute skills/prompts/themes.
- Franklin has no equivalent.
- Verdict: real only if Franklin wants extension packages to contribute auxiliary resources.

## 6. Estimate: How Many Truly New Franklin APIs?

My estimate depends on target scope.

### 6.1 If Franklin stays what it currently is

If Franklin remains:
- application-side middleware for ACP/mini-ACP agents
- not a full terminal coding harness
- not responsible for shell/editor UI

Then I think you only need **2-3 more genuinely new families**:

1. `ModelAPI`
- only if model/provider routing should be extension-visible

2. `HistoryAPI` / `CompactionAPI`
- only if compaction/tree/session-history customization becomes first-class

3. maybe `ResourceDiscoveryAPI`
- only if extensions/packages need to contribute prompts/skills/instructions/resources

Everything else can likely remain:
- `DependencyAPI`
- `StoreAPI`
- `EnvironmentAPI`
- `SessionAPI`
- `CoreAPI`

### 6.2 If Franklin wants parity with pi as a coding harness

Then I think you need **4-6 more real families**:

1. `InputAPI`
2. `UIAPI`
3. `ModelAPI`
4. `HistoryAPI` / `CompactionAPI`
5. `ResourceDiscoveryAPI`
6. maybe `PermissionPolicyAPI`

I would still not split out:
- event bus
- auth
- model registry singleton
- secrets
- telemetry sinks
- notification services

Those are better modeled as `DependencyAPI` resources.

## 7. Community-Wide Concern Set

Using pi plus other current systems:
- Claude Code hooks docs: https://code.claude.com/docs/en/hooks
- Continue customization/context providers: https://docs.continue.dev/reference and https://docs.continue.dev/customize/custom-providers
- OpenCode plugins: https://open-code.ai/en/docs/plugins
- Goose extensions/MCP: https://goose-docs.ai/docs/getting-started/using-extensions/
- OpenHands repository customization/plugins: https://docs.openhands.dev/openhands/usage/customization/repository and https://docs.openhands.dev/sdk/guides/plugins

I think the community has already clearly identified these harness-level concerns:

1. `Tool gating and policy`
- pre/post tool hooks
- blocking dangerous commands
- permission prompts

2. `Context augmentation`
- prompt fragments
- rules/instructions
- file/codebase/docs/web context providers

3. `Resource/tool federation`
- MCP servers
- external tools
- remote/local extensions

4. `Session/history lifecycle`
- resume/fork/branch
- compaction
- bookmarks/tree navigation

5. `Provider/model configuration`
- model switching
- custom providers
- transport/payload customization

6. `State and persistence`
- per-extension state
- shared state
- replay/restore

7. `Shell/UI adaptation`
- commands
- hotkeys
- notifications
- custom views/widgets

8. `Packaging/discovery/reload`
- local/global auto-discovery
- package ecosystems
- hot reload / enable-disable

9. `Environment/policy localization`
- sandboxing
- remote execution
- container/worktree targeting

So no, the space is not “done” in the sense of already being reducible to one hook system. The community has surfaced a fairly broad concern set.

## 8. What Still Looks Underexplored

These are the concerns I think are real but not yet cleanly solved across the ecosystem:

1. `Typed extension composition`
- everyone mostly has hook bags, registries, and load order
- very few systems express phase, overlap, or composition laws in types

2. `Permission algebra`
- current systems do hook-based deny/allow and UI confirmation
- few have principled composition for multiple policy sources

3. `Multi-agent/shared-state semantics`
- session child/fork exists
- robust shared memory, conflict resolution, and agent-to-agent coordination remain ad hoc

4. `History semantics`
- compaction exists
- principled APIs for branching, summarization, provenance, replay, and selective forgetting are still immature

5. `Extension conflict resolution`
- duplicate tool/command collisions are usually load-order conventions
- few systems have real namespace/capability algebra

6. `Economic control`
- cost/latency/budget routing is increasingly important
- not many harnesses expose it as first-class extension surface

7. `Observability/evals as extension inputs`
- telemetry exists, but “extensions reacting to eval signals, benchmarks, or policy violations” is still weak

8. `Portable harness abstractions`
- most extension systems are tied to one UI shell or one loop implementation
- Franklin’s protocol-centered approach is unusual here

This is the strongest argument that Franklin’s algebra is not gratuitous. The ecosystem has breadth, but not much principled factoring.

## 9. Bottom Line

My current view:

- Pi is evidence that the concern set is broad.
- Pi is **not** evidence that the right design is one monolithic extension API.
- Franklin’s algebra is justified because the concerns are genuinely heterogeneous:
  - some are loop hooks
  - some are state
  - some are environment
  - some are session transformers
  - some are just dependencies
  - some are UI-shell concerns

The mistake would be to read pi as “there is one extension API and everything else is overkill.”

The better reading is:

> The community has discovered many concerns, but most existing systems flatten them into one bag of hooks. Franklin’s opportunity is to keep the mathematically clean split for the reusable runtime concerns, and only add new families where a concern is actually semantically distinct.

My estimate:

- **Not many more unique middleware-level APIs**: probably `Model`, `History/Compaction`, maybe `ResourceDiscovery`.
- **Several more shell-level APIs** if Franklin wants to become a full coding harness: `Input`, `UI`, maybe `PermissionPolicy`.
- **A lot of apparent extra APIs are just `DependencyAPI` specializations**.

So the algebra is not overkill yet. The bigger risk is the opposite one: collapsing distinct concerns too early into a pi-style monolith and losing the ability to reason about phase and composition.
