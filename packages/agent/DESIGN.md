# Agent System Design

This document captures design decisions for:
- "Agent Tools" (FRA-129).

---
## Systems

### Agent Tools (FRA-129)
The "Task" system is also relevant here as an execution model for agents, but can be considered later. 
#### Agent Creation


##### Spawn Interface

A spawn call specifies two things:

- **What it should do** = prompt text (the task brief)
- **What it can do** = tool/extension permissions

These map to Franklin primitives: `SessionManager.child(parentId)` + `runtime.prompt(task)` + result extraction. The spawn interface is a *composition* of existing primitives, not a new session creation method. It is an orchestration layer on top.

#####  Agent Definition Format

They are a packaging format for pre-composing a prompt + permissions into a named, reusable unit.

The ecosystem is converging on markdown files with YAML frontmatter:
- Pi: `~/.pi/agent/agents/*.md`
- Cline: `~/Documents/Cline/Agents/*.yaml`
- Goose: `.goose/agents/`, `.claude/agents/`, `~/.agents/agents/*.md`

Frontmatter schema: `name`, `description`, `tools` (list), `model` (optional), `extensions` (optional). Body = system prompt.

> **Deferred question:** Is there an emerging online standard for agent definition files? The markdown+YAML pattern is converging independently across harnesses but has no formal spec yet.

##### Context Inheritance 
Semantics are inherited from `child` semantics of runtimes. Franklin's child inheritance maps to:

| API                  | Child semantics                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| **CoreState**        | Fresh history, same config (model/provider), same tools (by default). Overrides allowed at spawn time. |
| **EnvironmentState** | Same environment (cwd, platform)                                                                       |

Tools are inherited by default — restriction is opt-in, not the default. This matches the majority of harnesses (Claude Code's `general-purpose` type gets all tools).

##### Tool Restriction

i) **Requires mechanism for tools be enabled and disabled** (as of April 8th 2026, all registered tools are enabled, this needs to get solved seperately)
ii) **Specification strategy**: usually by name, as part of an explicit or implicit permissions algebra.
Approaches observed:

| Approach                                     | Used by                |
| -------------------------------------------- | ---------------------- |
| Hardcoded type-to-toolset                    | Claw Code, Claude Code |
| Permission rules (ordered, last-wins)        | OpenCode               |
| Explicit extensions param (subset of parent) | Goose                  |
| Boolean flag removes spawn tool from prompt  | Cline                  |
| Agent file declares own tools list           | Pi                     |




> **Outstanding question:** Why restrict tool permissions at all? Is a prompt not sufficient? For agent-as-tool (sync, brief), prompt-only restriction is probably fine. For agent-as-task (async, long-running, unsupervised), prompt-only breaks down because the LLM can ignore instructions. Pragmatic answer: **don't build permission restriction into v1**. Start with "child inherits all parent extensions." Add selective filtering later if needed.

> **Deferred question:** Does the tool registration mechanism need a rethink to support permissions? Options: (a) filter at `setContext` time in `buildToolInjector`, (b) compile different extension lists per session type, (c) CtxTracker-like live component. Option (b) is the natural fit — the spawn extension already controls what extensions the child runtime is created with.

###### Recursion Control / Tool Restriction on the AgentSpawn Tool

No harness uses a depth counter. Every one uses tool/permission restriction.

The decision is binary: does the child get the spawn tool or not? That's a tool permission decision. Implementation: the spawn extension checks whether the current session is already a child (via `CoreState.isChild` flag) and conditionally registers the spawn tool during `compileAll`.


---

#### Agent Interaction

##### Approval Delegation

This is the concern of the upcoming **DecisionsAPI** child semantics. The question is: does the child's DecisionsAPI bubble up to the parent's, or does it auto-resolve?

Observed approaches:
- OpenCode surfaces approval requests directly to user
- Cline and Goose absorb them (auto-approve)
- Claw Code has no HITL mechanism for children


##### Conversation Visibility

In a system where agents are already first-class inspectable objects (via the conversation extension), progress reporting is free. If children are sessions in the SessionRegistry, they're already visible.

The UI question is: should the child agent be shown in the sidebar or hidden? If the child is intended to be ephemeral (agent-as-tool), hiding it makes sense. If persistent (agent-as-task), showing it. The session could carry a `visibility: "ephemeral" | "visible"` flag.


##### Result Visibility / Last Turn Specification

Two approaches exist for extracting the child's result:

1. **Last message extraction** (everyone) — take the final assistant text from the child's turn
2. **Explicit `final_output` tool** (Goose only) — forces structured output via JSON schema validation

For Franklin: the child's turn ends, the last `update` event contains the assistant message, the parent's `toolExecute` handler extracts and returns it as `ToolResult.content`.

> **Deferred question:** Should Franklin support structured output via a schema-validated `final_output` tool? This is a differentiator opportunity (only Goose does it).



##### Cancellation

For agent-as-tool (sync): cancellation = the parent's `cancel()` propagates to the child's `runtime.cancel()`. This is straightforward.

For agent-as-task (async): the task handle needs to expose `cancel()`, which is just `runtime.cancel()` on the child session. The calling interface isn't lost; it moves from "implicit via parent abort" to "explicit via task handle."


##### Multi-turn Interaction

- How do you support one agent triggering a follow up prompt on a child agent?



---



## Subsystems we should mine

### Agent Coordination

**Filesystem as IPC**:  Claw Code's pattern (`.clawd-agents/<id>.{json,md}`). Relevant if Franklin goes multi-process. Not needed for in-process agent-as-tool.                                                                            
**Notification Bridge**  Goose's pattern for forwarding child events to parent. In Franklin: can a `toolExecute` handler emit progress events while still running? If Mini-ACP's streaming model supports nesting, this is free. If not, needs protocol work.


### Task System 

Async. The tool returns immediately with a handle/id. The child runs independently. Result retrieval is a separate concern (polling, notification, etc.).

Both use the same spawn mechanics — the difference is whether the parent's tool execute callback `await`s the child's completion or not.

Goose is the only harness supporting both via an `async: bool` parameter (default sync). This is the cleanest API observed.

### Harness System Prompt
- Behaviour Instructions
- Environement Context