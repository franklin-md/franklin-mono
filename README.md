# Franklin

This folder is the seed of the standalone Franklin repo.

It contains three kinds of documents:

## 1. Architecture commitments

These are the documents that reflect the current committed direction.

Start here:

- [ARCHITECTURE.md](/Users/afv/git/franklin-plugin/franklin/ARCHITECTURE.md)

Read these as the current shape of the system unless later documents explicitly replace them.

## 2. Planning notes

These are working design notes that help define core abstractions.

Current planning notes:

- [managed-agent-protocol.md](/Users/afv/git/franklin-plugin/franklin/docs/managed-agent-protocol.md)
- [managed-agent-protocol-minimal.md](/Users/afv/git/franklin-plugin/franklin/docs/managed-agent-protocol-minimal.md)
- [runtime-surface-note.md](/Users/afv/git/franklin-plugin/franklin/docs/runtime-surface-note.md)

These are important, but they are still design notes. They may be refined or replaced as implementation begins.

## 3. Research notes

These are input documents used to inform the architecture.

Current research notes:

- [research-runtime-core.md](/Users/afv/git/franklin-plugin/franklin/docs/research-runtime-core.md)
- [research-communication-protocols.md](/Users/afv/git/franklin-plugin/franklin/docs/research-communication-protocols.md)
- [research-local-capability-bridges.md](/Users/afv/git/franklin-plugin/franklin/docs/research-local-capability-bridges.md)

These should be treated as supporting material, not commitments.

They are useful for:

- tracing why a decision was made
- comparing alternatives
- revisiting assumptions later

They can be condensed, archived, or discarded once the design is stable and the implementation has absorbed the important conclusions.

## Reading order

If you are new to this folder, read in this order:

1. [ARCHITECTURE.md](/Users/afv/git/franklin-plugin/franklin/ARCHITECTURE.md)
2. [managed-agent-protocol.md](/Users/afv/git/franklin-plugin/franklin/docs/managed-agent-protocol.md)
3. [runtime-surface-note.md](/Users/afv/git/franklin-plugin/franklin/docs/runtime-surface-note.md)
4. The research notes only as needed

## Current status

What is currently committed:

- managed agent is the core abstraction
- app-to-agent communication is a first-class protocol
- vendor-specific details stay inside adapters
- PTY is deferred
- runtime harness and local capability bridge are separate concerns

What is still open:

- exact wire format and schema details
- controller-owned state model
- package-level implementation details
- first adapter execution plan
