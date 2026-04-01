# Mini-ACP Design
*Mini-ACP is sometimes aliased to Mu and may change name because of it divergence from ACP (in addition to its simplification)*

## Overview and Philosophy
> Mini-ACP defines a protocol for communication between any Agent and Application. 

This is a bi-directional protocol where both parties engage at different times as both Client and Server to eachother. The protocol does not mandate a codec for messages, but JSON-RPC 2.0 is suggested.

At a glance:
- **Agents have state but there is no session persistence on the agent's side**:
  - Throughout the protocol, the agent's `Context` changes as it keeps track of:
    - **Explicit Changes through `setContext`**,as would be expected from applications that implement sessions through `fork` and `resume` semantics over the `History`, and from applications wishing to change the current `LLMContext`
    - **Implicit Changes during `prompt`**, in which the context grows with new user messages, assistant messages, and tool invocations.
  - **The Context is empty at the start of the protocol**
- **Externalized Tool Execution**
  - All tool requests must be sent to the application to handle.

## Motivation
Below, we explain the reasons why Mini-ACP was developed, including mention of previous work that inspired it's creation

- [ ] Just as LLMs have converged towards 1 interaction flow (the openAI standard [...]), agents might also be worth converging towards 1 single interaction flow.

### Protoclization
- Cross boundary communication (remote, local, in process, in seperate process etc)
- Agnostic of Agent implementation (although less of a reason because agents are so minimal there isn't that many degrees of freedom anyways), but could be useful when some LLMs are run locally (the agent is in charge of the lifecycle of the LLM too)


### Minimal Agent
- [ ] The domains of definition (that sdk for implementing Apps that talk with agents looks like an ACP compliant agent, but the entire state and behaviour is within the developer's control and can be programmatically queried and mutated)
  - [ ] Why session persistence is not an agent responsibility    
  - [ ] Why Tool execution is better served in application code. 
    - [ ] Developments in common coding agents workflows should not require a change to the protocol.
    - [ ] Makes no assumption on capabilities of agent environment (The application advertises its own capabilities) (ulike the contract of clientcapaiblites of ACP)
      - [ ] https://agentclientprotocol.com/protocol/file-system  
      - [ ] https://agentclientprotocol.com/protocol/terminals
      - [ ] https://agentclientprotocol.com/protocol/slash-commands
      - [ ] https://agentclientprotocol.com/protocol/agent-plan
  - [ ] That Context Management and Tool Control are all that is needed to extend agent
- Problem Agnostic


## Protocol Specification Draft 1.0


### Initialization
Once a transport has been established between the two parties, the following should be assumed:
- The agent has an empty context

### Turn

#### Turn End: 
- [ ] Missing Usage Information



## Support for other Standards
The ecosystem has slowly converged on a series of standards for agent subsystems, such as MCP. This section discusses **how such capabilities may be reimplemented on top of this protocol**

### Session Management
#### Persistence
- https://agentclientprotocol.com/rfds/session-delete
- https://agentclientprotocol.com/rfds/session-resume
- https://agentclientprotocol.com/rfds/session-list

#### Forking
- https://agentclientprotocol.com/rfds/session-fork


### MCP

### Skills

### AGENTS.md

