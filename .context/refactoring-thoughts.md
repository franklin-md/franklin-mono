## Goal

Clean up the Core Module boundaries around context synchronization, session
snapshot projection, runtime creation, runtime inspection, and tool exposure.

## Current Understanding

- `ContextManager` should not be treated as a durable abstraction to polish. It
  has been useful as a coordination point, but its consumers should continue to
  be split by capability instead of replacing it with another broad type.
- `ContextManager.add` has been removed.
- `ContextLedger` is accepted as a real class in `context-manager/ledger/`, with
  public surface limited to `sync()` and `getDraft()`. It no longer implements
  `ContextRecorder`; protocol recording is a companion object.
- `SessionDraft` lives under `context-manager/draft/`. That folder exports only
  `createSessionDraft` and the `SessionDraft` type.
- `ContextManager` owns `SessionSnapshot` projection from ledger draft state,
  usage, and the real `ToolRegistry`. Avoid narrowed provider interfaces such as
  `ToolFilterProvider` when the real registry is the domain object.
- Runtime inspection cleanup has landed: `CoreRuntime.inspect()` owns the
  redacted inspect projection, and `inspectRuntime(runtime)` is now a wrapper.
  The hidden runtime context-manager attachment and `from-client` runtime layer
  are gone.
- Tool registry/decorator cleanup has landed: `ToolRegistry` now owns only
  bound-tool definitions, filtering, enable/disable state, and registered-tool
  execution. Observer notification and unknown-tool fallback live at the tool
  decorator boundary.
- Tool definition revisions are derived from enabled definitions sorted by name
  instead of a registry-owned numeric revision counter. This still assumes tool
  names are unique; duplicate-name policy remains unresolved.
- Usage aggregation can stay as a running aggregate for now. Longer term, a full
  history model should likely persist turn boundaries such as `turnEnd` and
  derive aggregate usage by folding that history.
- The main remaining design debt is the prompt flow. Draft state,
  context-tracker state, constructed prompt text, and the decorated `prompt`
  path still interact in ways that need an audit before introducing more
  structure.
- Future code edits should distinguish human intent from advisory agent notes,
  especially where older proposals in the log have been superseded.

## Observations

### Binding Human Intent

- Prefer real domain objects over narrowed provider interfaces when the latter
  only exist to make tests easier.
- Keep folder boundaries simple and name files for the concept they own; avoid
  repeating parent directory names in filenames.
- Runtime inspection should be explicit runtime API, not hidden state attached to
  the runtime.
- The prompt flow needs a separate audit before adding more abstractions.

### Smells And Questions

- Usage Tracking seems bolted on, seems mixed in but a little unnecessary for the type?
  - Is this tracked usage information ever explicitly consumed?
  - How does the usage tracking work for the individual turns?
  - If we stored the `turnEnd` to State (and therefore persisted it), won't that allow us to recover the aggregate usage, and avoid this additional tracking system?
- Should inspect eventually expose both desired draft context and last-sent
  Mini-ACP context, or is the redacted current context enough?

## Tasks

- [x] Remove `ContextManager.add` as is dead code
- [x] Move `ContextLedger` into its own folder with tests, keeping it as a class with `sync()` and `getDraft()`
- [x] Split protocol recording from context tracking/syncing so `ContextLedger` is not-a `ContextRecorder`
- [x] Move snapshot projection out of `ContextLedger` and back into `ContextManager`
- [x] Keep ledger copy/patch operations folder-local and move `planPatch` / `recordSent` back into `ledger.ts` as private methods
- [x] Move session draft assembly into `draft/`, with folder-level `createSessionDraft` and internal draft-context/drafter files
- [x] Decide and implement the inspect surface so the runtime no longer needs hidden attached `ContextManager` state
- [x] Write out the `CoreRuntime` type more clearly, with grouped runtime methods and comments
- [x] Remove the internal `AgentClient` alias and inline `from-client` into runtime creation
- [x] Rename the external runtime tool-control type to `ToolRegistry`
- [x] Flatten the tool decorator into `tool.ts` and remove `ToolRegistry.createHandler()` / `buildToolServerMiddleware`
- [x] Move tool observers and fallback delegation out of `ToolRegistry` and into the tool decorator
- [x] Remove `ToolRegistry.hasRegistrations()`, `hasObservers()`, and numeric `revision()`
- [x] Change `ToolRegistry.dispatch` to take a `ToolCall` and return a registered execution result or `undefined`
- [x] Derive tool-definition revision from enabled definitions sorted by name
- [ ] Split remaining `ContextManager` consumers by capability where there is still concrete value
- [ ] Audit the prompt flow stages: draft, context tracker, constructed prompt, decorated prompt, and where information crosses between them
- [ ] Revisit usage aggregation if turn history becomes persisted state

## Log

### Agent Note 2026-05-24-01

Human intent I am preserving:

- The refactor should clean up the Core Module connection points around context management, context syncing, runtime creation, and runtime exposure.
- `ContextManager` feels arbitrary because it bundles unrelated concerns.
- Usage tracking should be questioned as part of this type, not accepted as a given.
- Hidden context-manager state attached to the runtime is a design smell.

Observation:

- `ContextManager.add` appears to be dead API surface and is a safe first cleanup candidate.
- `usageTracker` is consumed by tracking and snapshot projection, but that does not mean it belongs on a context-manager-shaped type.
- `getAgentContext` exists mainly for inspect/debug assertions, which suggests it should be a deliberate inspection projection rather than a reason to attach the whole manager to the runtime.
- The runtime currently exposes the persisted/session projection through `getSession`, while the live Mini-ACP context projection is recovered through hidden runtime state. That split is probably the core boundary problem.

Proposal:

- First delete or fold dead surface (`ContextManager.add`) without changing behavior.
- Then split consumers by capability: context sync, protocol recording, usage accumulation, session snapshot projection, and inspect projection.
- Avoid introducing a new broad replacement type until the consumers show whether one cohesive object remains.

Open question:

- Should usage remain a running aggregate, or should future persisted turn events become the source of truth for deriving usage?
- Should inspect expose sent context, desired draft context, or both?

### Agent Note 2026-05-24-02

Completed:

- Removed the dead `ContextManager.add` method from the interface and factory object.
- Removed the now-unused `Usage` import from the context-manager type file.

Verification:

- `npm run typecheck -w @franklin/agent`
- `npm run test -w @franklin/agent -- src/modules/core/context-manager/__tests__/create.test.ts`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- `git diff --check`

Next candidate slice:

- Split `usageTracker` out of the `ContextManager` type before renaming or replacing the broader abstraction.

### Agent Note - 2026-05-24 15:12

Observation:

- Added a compressed head so future agents can start from the current direction without replaying the whole log.
- Later human discussion changed the priority of the usage question: the aggregate tracker can stay for now, while the future full-history model remains the likely long-term direction for compaction and derived usage.
- The current worktree already shows `ContextManager.add` removed from the interface and factory, so the task list now marks that slice complete.

Proposal:

- Treat the next implementation slice as the inspect/runtime-storage cleanup, not usage tracking. The immediate code-quality win is to stop attaching the whole context manager to `CoreRuntime` just so `inspectRuntime` can recover a live context projection.

Open Question:

- Should inspect expose only the sent Mini-ACP context, or should it expose both sent context and desired draft context once the draft/sync pieces are split further?

Agent Work:

- Updated this note only. No source code was edited in this note-maintenance pass.

### Human Note

**On Context Ledger:**
I like the idea of Context Ledger, but I feel that it should probablyt be all put into its own folder, with tests

I dont like in general narrowed interfaces (Like ToolFilterProvider instead of ToolRegistry). I appreciate this is to make testing easier, but I think the solution is to create easier mocking facilities for things like ToolRegistry.

I also dont like the fact it is-a ContextRecorder. I would want to split this out:

- Context Recording from Context Tracking and Syncing.

Other smaller smells:

- `getSnapshot` calls `sesionSnapshot`, but really we can just inline this, and put a commment that you get a copy.

_Questions:_

- I wonder if ContextLedger's public interface should just be `sync`? We need some way for it to keep track of `appends` and `apply`s.

### Agent Note - 2026-05-24 12:14

Decision:

- Accepted `ContextLedger` as a real class, but with a narrow public surface: `sync(client)` and `getDraft()`.
- Accepted splitting protocol recording from context tracking/syncing. The tracking decorator now uses a separate recorder instead of passing the ledger as a `ContextRecorder`.
- Accepted moving `SessionSnapshot` projection out of `ContextLedger`; `ContextManager` now projects snapshot state from the ledger draft, usage tracker, and real `ToolRegistry`.
- Accepted simpler local names inside the context-manager folder: `copy.ts`, `fields.ts`, and `ledger/` rather than repeating the `context-` prefix.

Agent Work:

- Moved the old single-file `context-ledger.ts` into `context-manager/ledger/{create,ledger,recorder,operations,types,index}.ts`.
- Added `ContextLedgerRecorder` as the protocol-recording adapter for `apply` and `append`.
- Removed narrowed tool provider interfaces in favor of passing the real `ToolRegistry`.
- Added tests that assert ledger draft state excludes runtime-only system prompt/tools and that snapshot projection stays on `ContextManager`.

Verification:

- `npm run test -w @franklin/agent`
- `npm run typecheck -w @franklin/agent`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- `git diff --check`

Next candidate slice:

- Inspect/runtime storage cleanup remains the next design slice: stop attaching the whole context manager to `CoreRuntime` just so `inspectRuntime` can recover the sent Mini-ACP context.

### Human Note

**Smells / Cleanups**:

- I think everytinng in copy.ts is actually only consumed in ledger. This makes me think that surely the ledger should have a folder for operations, grouped thematically? Like, `copy`
- I feel that planPatch and recrodSent should probably just be in the ledger.ts as private methods. They should be well documented and then it simplifies the args.
- I think we should probably have a folder called `draft`. In it, we can move lots of the logic for assembling the draft to it, including how to create the 2 drafters. I would also split out draft from draftContext.
  - We should think about the draft folder's export interface. I think it should jsut be: "how to create a draft", the type of draft. We can also rename the export and have the term Draft internal to the folder and same with DraftContext (exporting to 'SessionDraft')

**Big Tech Debt**:

- I think the entire flow is getting confusing. We currently have:
  - Draft
  - Context Tracker
  - The constructed `prompt`.
  - The decorated step of `prompt` from the context manager
- What confuses me is that it feels like we are (in a very indirect way) touching multiple stages in the prompt flow and sending information between. We need to audit if this is even necessary

### Agent Note - 2026-05-24 12:50

Decision:

- Accepted the ledger folder cleanup as the actual narrower shape: no `context-` filename prefixes inside `context-manager`, no standalone operations folder, and `planPatch` / `recordSent` kept as private `ContextLedger` methods.
- Accepted the draft folder as the ownership boundary for creating session drafts. `ContextManager` should call `createSessionDraft(input)` instead of manually creating a system-prompt builder, registering drafters, and constructing `SessionDraft` directly.

Agent Work:

- Committed `6d24119f refactor(agent): narrow context ledger surface`.
  - `ContextLedger` now exposes only `sync(client)` and `getDraft()`.
  - `ContextLedger.create` returns the ledger, a companion `ContextRecorder`, and `getSentContext` for the manager/inspect path.
  - Ledger copy/patch helpers live in `ledger/copy.ts`; patch planning and sent-recording logic live as private methods in `ledger.ts`.
- Committed `4602e89c refactor(agent): move session draft into folder`.
  - Moved draft code into `draft/{create,session,context,system-prompt,tools,types,copy,index}.ts`.
  - The draft folder exports `createSessionDraft` and the `SessionDraft` type only.
  - Moved draft tests into `draft/__tests__/create.test.ts` and changed them to cover real system-prompt/tool registrations through `createSessionDraft`.
  - Kept `pickLLMConfig` local to `ContextManager` because snapshot projection is manager-owned, not ledger/draft-owned.

Verification:

- `npm run test -w @franklin/agent`
- `npm run typecheck -w @franklin/agent`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- `git diff --check`

Next candidate slice:

- Audit or narrow the inspect/runtime storage surface. The current smell is still that runtime inspection reaches live context through hidden context-manager state.
- Separately, audit the bigger prompt flow before adding more structure: draft state, context tracking, constructed prompt, and decorated `prompt` currently interact in ways that are hard to reason about.

### Agent Note - 2026-05-24 12:58

Decision:

- Accepted the context-manager audit cleanup slice: remove dead code and consolidate duplicated copy/patch field logic without changing the broader inspect/runtime design.

Observation:

- `SessionDraft.reset()` is uncalled in the current split and looks like leftover `ContextTracker` surface.
- `Slot.runCount` is only asserted by slot tests; production assembly behavior does not read it.
- Full-context copying is duplicated between `draft/copy.ts`, `ledger/copy.ts`, and `contextToPatch`.
- Empty-patch detection repeats the field list already centralized in `fields.ts`.

Agent Work:

- Planned cleanup: remove the unused draft reset method and slot run counter, move shared context copy helpers to a single folder-local helper, and make empty-patch detection use the central field list.

### Agent Note - 2026-05-24 13:04

Agent Work:

- Removed the unused `SessionDraft.reset()` method.
- Removed `Slot.runCount` and the tests that only asserted that internal counter.
- Consolidated context-copy helpers into `context-manager/copy.ts` and deleted the duplicate draft/ledger copy files.
- Added `isEmptyPatch()` beside `fieldsInPatch()` so patch emptiness uses the central context-field list.

Verification:

- `npm run test -w @franklin/agent -- src/modules/core/context-manager`
- `npm run test -w @franklin/agent`
- `npm run typecheck -w @franklin/agent`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- `git diff --check`

### Human Note

**Goal**:
Clean up the awful runtime folder

**Observations**

- [ ] AgentClient is used internally as just a simple alias and then used in compile. I think we can just remove and simplify.
- [ ] From the endure core module, we want to export only RuntimeToolRegistry, and call this ToolRegistry (that external api)
- [ ] Lets expand the CoreRUntime type instead of using pick. Also group together the methods.
- [ ] I would merge the implementation of from-client into `create` just so there is really just one file about runtime creation.
- [ ] I want to get rid of the entire context-manager.ts file in runtime folder. I understand it is basically only used to make inspect work, so that is why I suggest for now, we just expose `inspect()` on the runtime type. We can put a comment above or something for later.

### Agent Note - 2026-05-24 13:24

Decision:

- Accepted the next runtime cleanup slice: move the inspect/redaction behavior onto `CoreRuntime.inspect()`, keep `inspectRuntime(runtime)` as a wrapper, and delete hidden `attachContextManager` / `getContextManager` plumbing.

Agent Work:

- Planned implementation: expand the runtime type, inline `from-client` into `create`, remove the internal `AgentClient` alias, rename the external runtime tool-control type to `ToolRegistry`, and update call sites/tests so inspect uses the explicit runtime method.

### Agent Note - 2026-05-24 13:49

Decision:

- Accepted the runtime cleanup slice as completed by `87ccc436 refactor(agent): move inspect onto core runtime`.
- Accepted the tool decorator cleanup as completed by `17c18298 refactor: flatten tool decorator`.

Agent Work:

- Cleaned the compressed head and task list so they reflect completed runtime and tool-decorator slices.
- Kept historical human notes intact and normalized only note headings.
- Left the remaining open work focused on prompt-flow audit and future usage-history design.

Verification:

- Read `packages/agent/src/modules/core/runtime/{types,create}.ts`.
- Checked stale references for `attachContextManager`, `getContextManager`, `AgentClient`, `createClientRuntime`, `from-client`, `buildToolServerMiddleware`, and `createHandler`.

### Human Note

**Goal**:
Clean up the tool registry / tool decorator split.

**Observations**

- `ToolRegistry` is doing too much.
- Smell: it owns observers and versioning, so its responsibility is not just
  tool lookup/execution state.
- `hasRegistrations()` does not really make sense on `ToolRegistry`. It is only
  consumed in one place, so it can probably move inline near the decorator setup.
- If observers move out of `ToolRegistry`, then `hasObservers()` and
  `hasRegistrations()` should both go away.
- `createToolRegistry` should no longer need the whole `CoreRegistry`.
- Observers are still important, but they probably belong at the tool decorator
  layer. The decorator can take both the `ToolRegistry` and the observer
  registrations.
- `dispatch` is currently shaped too much like middleware. It should take a
  `ToolCall` and return a tool execution result.
- The middleware/fallback behavior should live in the decorator, not the
  registry.
- Once observer ownership moves out, registry dispatch becomes simple: fetch the
  tool, check whether it is enabled, execute it, or return a disabled/error
  result.
- Keep `fallbackExecutionResult`, but use it from the decorator path where
  unknown-tool fallback is actually handled.
- Version numbering also feels unnecessary. In `createToolDefinitionDrafter`,
  take the enabled tool definitions, sort them by name, and use that as the
  revision token.
- Add a note near that revision token that this assumes tool names are unique;
  if two tools register the same name, the current model still has a conflict.

### Agent Note - 2026-05-24 13:53

Proposal:

- Split `ToolRegistry` down to tool-state and registered-tool execution:
  definitions, filter, `setEnabled`, and a simple `dispatch(call)` that only
  handles registered tools.
- Move observer creation and notification into `createToolDecorator`, using
  `CoreRegistry.handlersFor('toolCall')` and `handlersFor('toolResult')` there.
- Let `createToolDecorator` own the full middleware shape: notify `toolCall`,
  ask the registry to execute registered tools, reject disabled tools through the
  registry result, delegate unknown tools to the fallback server, convert
  fallback output with `fallbackExecutionResult`, then notify `toolResult`.
- Remove `ToolRegistry.hasRegistrations()` / `hasObservers()` after the decorator
  decides whether it should exist from local inputs: registered tool count plus
  observer handler count.
- Change `createToolRegistry` to take just the bound tools and initial
  `ToolFilter`, or add a small factory at the compiler boundary that extracts
  bound tools from `CoreRegistry`.
- Remove numeric `revision()` from `ToolRegistry`. Have
  `createToolDefinitionDrafter` derive a stable revision key from enabled tool
  definitions sorted by name, with a comment documenting the unique-tool-name
  assumption.
- Keep this as a separate cleanup slice from the prompt-flow audit.

Constraint:

- Do not commit.

### Agent Note - 2026-05-24 14:07

Decision:

- Accepted and completed the tool-registry responsibility split proposed in the
  previous note.
- The previous "Do not commit" constraint is superseded by the later direct user
  instruction to commit this cleanup and note update.

Agent Work:

- Removed observer ownership, `hasRegistrations()`, `hasObservers()`, and
  numeric `revision()` from `ToolRegistry`.
- Changed `ToolRegistry.dispatch` to accept a `ToolCall` and return
  `ToolExecutionResult | undefined`, leaving unknown-tool fallback to the
  decorator.
- Moved `toolCall` / `toolResult` observer notification and fallback conversion
  into `createToolDecorator`.
- Updated the test compile harness to mirror the decorator-owned tool middleware
  behavior.
- Changed tool definition drafting to sort enabled definitions by name and use
  that sorted definition list as the tools revision token, with a comment
  documenting the unique-name assumption.

Verification:

- `npm run test -w @franklin/agent -- src/modules/core/tools/__tests__/registry.test.ts src/modules/core/compile/decorators/__tests__/tool.test.ts src/modules/core/context-manager/draft/__tests__/create.test.ts`
- `npm run typecheck -w @franklin/agent`
- `npm run test -w @franklin/agent`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- `git diff --check`
