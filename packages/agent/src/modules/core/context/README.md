## Context State Notes

Given a stateful agent - in our case the Mini-ACP agent, but the Pi core-agent
would also do - the controller has to synchronize agent context with higher
level mechanisms such as:

- **Tool Registry**:
  - **Tool Filtering** based on dynamic list of enabled/disabled tools
- **Dynamic System Prompt**:
  - Handlers can be provided that recompute parts of the system prompt on each turn.

These mechanisms require their own way to track changes, then synchronize with the agent's state, keeping patches as small as possible in the case the agent is remote.

### Observations:

**Only needs to sync context just before driving the agent-loop**:

The local context may be contributed to at any time during the agent's
lifecycle. For example, the user may wish to change the current LLM, change
reasoning level. Also, extensions may trigger changes to the set of active
tools.

This information isn't actually consumed by the agent **until the loop gets driven, so we can defer syncing until then.**

### Strategy/Algorithm:

`SessionDraft` owns the desired durable state plus runtime drafters. `ContextLedger`
owns the last successfully sent Mini-ACP context and computes full initial syncs
or smaller follow-up patches from field revisions. The `AgentController` owns
when those pieces are used: sync before prompt, record acknowledged direct
context changes, and project session/inspect state for the runtime.

### Durable history

`SessionDraft` stores original typed `message` entries and `compaction`
checkpoints separately from its Mini-ACP context tracker. Hydration and the
internal `appendCheckpoint` operation use the pure
[history projector](../history/project.ts). Its visible state accumulates each
message and resets to the summary on each checkpoint. Everything before that
checkpoint is hidden, including previous summaries; the durable entries stay
intact. Entries use log order and carry no IDs; projection returns Mini-ACP
messages directly. Summaries are validated before changing either collection.

`ContextLedger.sync` sends the committed projection directly to the connected
Mini-ACP client and acknowledges only its sent-context tracker. It never calls
`SessionDraft.apply` with those projected messages. Rejected sends leave the
history and message revision pending; later recorded messages cannot acknowledge
an unsent checkpoint projection.

The ledger exists because desired context and agent context can differ: a
restored session has durable history while a fresh agent has received nothing,
and a failed send must stay pending. Messages already exchanged through prompt
and update events are recorded on both sides so the next sync does not resend
them. This synchronization responsibility predates durable history.

`SessionDraft.apply({ messages })` has different, intentional semantics: an
explicit context reset replaces the durable log with new message entries and
discards the previous log, including checkpoints. `messages: []` clears it.
Patches without `messages` preserve history. This is the baseline bound-client
`setContext` replacement behavior, not an ordinary sync path. Callers that need
resets to retain the discarded log need a separately agreed reset event; no such
event is introduced here. See the [package history contract](../../../../README.md#durable-history-and-projection).
