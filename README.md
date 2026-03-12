# Franklin


## Vision:
- **General**
- **File Over App**

## Packages:
### `package/managed-agents`
- Standardized interface for communicating with popular agents like Codex and Claude Code
  - Commands for:
    - **Managing Agent Lifecycle**: `session.start`, `session.resume`, `session.fork`
    - **Sending User Turn Actions**: `turn.start`, `turn.interrupt`
    - **Additional User Signals**: `permission.resolve`
  - Receiving Events for:
    - [ ]
- Multiple agent adapters:
  - Local:
    - Codex
    - [ ] Claude Code
    - [ ] OpenCode
- Way of extending the agentic runtime including: [rephrase better]
  - Explicit Memory System
  - Runtime Provided Tools like:
    - **NameSession**
- [ ] Capabilities

### `package/agent-manager`


### [In Progress] `package/local-tools`
- SDK and standard for defining MCPs designed to interact with local applications.


## Development

### Testing Principles
- [ ] Live Integration Tests