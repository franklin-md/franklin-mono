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
