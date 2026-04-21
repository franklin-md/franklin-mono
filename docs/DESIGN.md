- [ ] TODO:
    - [ ] Set up publishing
        - [ ] Move franklin.md to Square Space
        - [ ] Setup docs.franklin.md as this vault
    - [ ] Atomize notes etc
    - [ ] Put reference to franklin.md in WELCOME.md
    - [ ] Add a couple of

# Agent System Design

This document captures design decisions for:

- Single Harness Behaviour:
    - Tool Systems:
        - Agent Tools (FRA-129)
    - Prompt Systems:
        - Agents.md
- Multi Agent Behaviour:
    - [ ] Agent Orchestration

---

## Systems

[[Auto-Loaded User System Prompts]]

### Agent Orchestration

#### Agent Ownership

- **Collection for global set of agents**
- All agent references are handles whose lifecycle does not need to be managed.

#### Creating Agents from other Agents:

Every runtime has a way to get a 'child' and 'fork' state, used to construct a new runtime and therefore agent from. This means agents may be used to seed other agents, creating an **implicit tree like structure**:

- `child` semantics create a "Parent-Child" edge
- `fork` semantics create a "Sibling" relation (common parent)

#### Creating Agents from scratch:

- [ ] There is a root to this tree that is not an agent (is just a state)
    - [ ] `new` operation

#### Grouping Agents

- [ ] Motivation: Seperated environements (Conductor example), group level shared store

##### Persistence

A bi-product of fact that Agent RuntimeSystem algebra have serializable state that can be used to also restore themselves

##### TODO

- Orchestration = User interacting with an agent (simple) + agent interacting with another agent (achieved through tools As If the agent were a user - same interface)
    - Interaction defintions (state sharing vs driving)

### Agent Tools (FRA-129)

Concerned with having agent's orchestrate each-other. We focus on the "Agent-Management-as-a-tool", with the question of actual Agent Management being the responsibility of "Agent Orchestration"

- **One-shot agents** are spawned, prompted and disposed in a single tool call (referred to as "Agent-as-a-tool")
- **Async agent management**, where the lifetime of the agent may persist beyond a single tool call and might even be interacted with across multiple turns, is not yet considered. But we believe this is another case of a more general "Task System", considered later.

#### Agent Creation

##### Spawn Interface

A spawn call specifies two things:

- **What it should do** = prompt text (the task brief)
- **What it can do** = tool/extension permissions

These map to Franklin primitives: `SessionManager.child(parentId)` + `runtime.prompt(task)` + result extraction. The spawn interface is a _composition_ of existing primitives, not a new session creation method. It is an orchestration layer on top — specifically, the `AgentBackend` adapter.

##### Agent Definition Format

They are a packaging format for pre-composing a prompt + permissions into a named, reusable unit.

The ecosystem is converging on markdown files with YAML frontmatter:

- Pi: `~/.pi/agent/agents/*.md`
- Cline: `~/Documents/Cline/Agents/*.yaml`
- Goose: `.goose/agents/`, `.claude/agents/`, `~/.agents/agents/*.md`

Frontmatter schema: `name`, `description`, `tools` (list), `model` (optional), `extensions` (optional). Body = system prompt.

> **Deferred question:** Is there an emerging online standard for agent definition files? The markdown+YAML pattern is converging independently across harnesses but has no formal spec yet.

##### Context Inheritance

Semantics are inherited from `child` semantics of runtimes.

Tools are inherited by default — restriction is opt-in, not the default. This matches the majority of harnesses (Claude Code's `general-purpose` type gets all tools).

##### Tool Restriction

1. **Requires mechanism for tools be enabled and disabled** (as of April 8th 2026, all registered tools are enabled, this needs to get solved seperately)
2. **Specification strategy**: usually by name, as part of an explicit or implicit permissions algebra.

Approaches observed:

| Approach                                     | Used by                |
| -------------------------------------------- | ---------------------- |
| Hardcoded type-to-toolset                    | Claw Code, Claude Code |
| Permission rules (ordered, last-wins)        | OpenCode               |
| Explicit extensions param (subset of parent) | Goose                  |
| Boolean flag removes spawn tool from prompt  | Cline                  |
| Agent file declares own tools list           | Pi                     |

> **Outstanding question:** Why restrict tool permissions at all? Is a prompt not sufficient? For agent-as-tool (sync, brief), prompt-only restriction is probably fine. For agent-as-task (async, long-running, unsupervised), prompt-only breaks down because the LLM can ignore instructions. Pragmatic answer: **don't build permission restriction into v1**. Start with "child inherits all parent extensions." Add selective filtering later if needed.

> **Deferred question:** Does the tool registration mechanism need a rethink to support permissions? Options: (a) filter registered tools at bootstrap time before serialization, (b) compile different extension lists per session type, (c) CtxTracker-like live component. Option (b) is the natural fit — the SessionSystem controls what the child gets via its `child()` semantics.

###### Recursion Control / Tool Restriction on the AgentSpawn Tool

No harness uses a depth counter. Every one uses tool/permission restriction.

The decision is binary: does the child get the spawn tool or not? That's a tool permission decision. Implementation: the `SessionSystem` compiler checks `state.agent.isChild` and conditionally exposes (or omits) the spawn capability from `SessionAPI.getSession()`. Extensions that depend on `getSession().spawn` simply don't register the tool when it's unavailable.

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

- **Filesystem as IPC**: Claw Code's pattern (`.clawd-agents/<id>.{json,md}`). Relevant if Franklin goes multi-process. Not needed for in-process agent-as-tool.
- **Notification Bridge**: Goose's pattern for forwarding child events to parent. In Franklin: can a `toolExecute` handler emit progress events while still running? If Mini-ACP's streaming model supports nesting, this is free. If not, needs protocol work.

### Task System

Async. The tool returns immediately with a handle/id. The child runs independently. Result retrieval is a separate concern (polling, notification, etc.).

Both use the same spawn mechanics — the difference is whether the parent's tool execute callback `await`s the child's completion or not.

Goose is the only harness supporting both via an `async: bool` parameter (default sync). This is the cleanest API observed.

### Harness System Prompt (FRA-127)

See [FRA-127: Mine harness system prompt](https://linear.app/janus-cards/issue/FRA-127/mine-harness-system-prompt-environment-context-and-behaviour) for:

- Behaviour Instructions
- Environment Context
