# Franklin

A middleware stack for ACP-compliant coding agents.


## Beliefs
- **Agents are the future core app primitive** just as form-building was during Web 2.0
  - [ ] Actually research into this app core primitive claim
- **The SIM Card Model**:
  - Instead of applications charging rent over expensive APIs, you will be able to **bring your existing authenticated, AI plan from OpenAI, Anthropic, etc., into a primarily free application**
  - Useful AI should be cheap and cost no more than a cup of coffee a day. By eliminating the unjustified rent of application companies, AI as a Utility can be charged at commodity prices.
 

## Vision:
- **General**
- **File Over App**

## What is this?

### Our SDK and Architecture

- The **Agent Context Protocol provides Minimal Agent Runtimes**
  - Franklin builds on the [Agent Client Protocol (ACP)](https://agentclientprotocol.com) — the industry standard for client-to-agent communication. Instead of reinventing the wire protocol, Franklin provides middleware that adds capabilities to the raw ACP connection

- A single **Agent Runtime maybe extended using Middleware**
  - [ ] You need to give a good definition of what an Agent Runtime is. Agent Loop + Hooks + Env?
  - Same core concern as Pi-Mono - to extend the agent runtime - but on top of ACP instead of Pi's Agent Loop
  - Examples:
    - Extensions (see below)
    - Auto-Permissioning / Sandboxing
      - https://github.com/anthropic-experimental/sandbox-runtime
      - In order to externalize the agent tool execution out of the bundled agent and into the middleware, we need to guarantee that the underlying agent has sufficiently strict and configurable controls. This involves the agents providing permissions for: Filesystem Read and Write, Terminal Execution, Tool Calling
      - Agents that currently do:
        - ...
- **Extensions**:
  - Installed into the Agent Runtime as Middleware, *allowing for modifying per-agent runtimes*
  - Defined and owned by the application, *allowing for interaction with application state and ui*
  - What can extensions do?
    - Orchestration: 
      - Spin up other agents by creating new or forked sessions
      - Session Naming
      - Agent <-> Agent Messaging Bus
        - [ ] I wonder i this is just exposing a tool for polling the bus and checking for any new messages
    - Workflow Primitives:
      - Todo lists
      - Question Asking
      - Plan Mode



## Quick example [placeholder - to do later]


## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) 
- [ ] Rewrite
