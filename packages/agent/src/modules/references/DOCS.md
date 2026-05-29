# Reference System

### **Problem Statement**:

> How do create a Reference -> Agent Context system that is extensible in the handling of resources?

Once created, this is useful because it allows for:

- Creating valuable predefined strategies for consuming and passing context to an agent. Terminal alone might neither be aware of existing services (like a Mistral PDF Converter), nor know how to cache the results to save on cost.
- Supporting reference-based context syncing with an agent. For example, your application may want the agent to see all the files (in Obsidian's case) or tickets (in Linear's case) that you have open. You only need to keep track of these as references, and then pass to the ReferenceEngine to materialize for you.

### **Design**:

- `Reference` stores `locator` (where the resource is) and `selector` (what parts of the resource)
- A reference's context identity is `locator + selector`. `label` is display metadata for UI and rendered provenance, so it must not affect cache keys, deduplication, or whether two references point at the same context.
- `ReferenceHandler` specifies:
  - `test`: Whether it can process this particular `Reference`
  - `toContext`: How it converts `Resource` into the agent context (i.e. `UserContent`)
- The `ReferenceEngine` keeps track of a list of registered `ReferenceHandler`s (added through the extension api).
  - Calling `toContext(Reference)` involves:
    - Finding the **first `ReferenceHandler` that matches**
    - Executing it, and potentially continuing down the chain if `delegate` was called.

#### Best Practices Defining Reference Handlers:

- **Materialization should be bound**:
  - There should be a per document specific policy for how much of it can be materialized in one go. For example, 'at most 10 pages' for pdf
  - It should have selectors that allow for a **complete pagination of resource**. This means that you can continiously make progress reading an infinite document. The smallest unit of selection must also be allowed (so that you dont get a case where it becomes impossible to read even a single page)
    - Pages is sufficient for PDFs, but chapters alone are not (as PDF metadata may not be complete )
    - Lines is sufficient for text
  - **If you exceed the bounds, a suggestion on how to correct should be materialized**
  - **Choosing to partially materialize is allowed** (i.e. to display the first n lines before truncating)
- **Selector interpretation should be sensible and permissive, but not wasteful**:
  - For example, asking for pages 1-10 of a 7 page pdf should return the first 7.
  - ASking for pages 12-10 should return no pages (as opposed to ALL pages)
- **Adding provenance to materialization is preferred**
  - For example, the name of the file that was read at the top of the Content Block

### **Noteworthy Use Cases:**

- An extensible version of `read_file` that calls the reference engine as opposed to trying to resolve contents of a predetermined set of filetypes.

---

## Todos:

- **Unchanged context tracking**:
  - If materialized text is being sent, you might inspect it and avoid sending it if it is alrady within the context window
    - This could actually be a `priority.lowest` that acts as a firewall (and therefore does not mix within materialization)

- **Instead of using `delegate`, we could just use suitable return objects**

- **Materialization result shape**:
  - TODO(FRA-343): Define a richer pipeline result than `ReferenceContext` before tightening `read_file` edit authorization. The final materialized view needs to distinguish actual resource content from diagnostic guidance such as "no lines selected" so read tools can decide whether the view is non-empty and edit-authorizing.
    - This should also revisit whether the pipeline should collapse `test` and `toContext` into a decline-capable `toContext` chain. Returning "not handled" from `toContext` would keep path/resource probing next to materialization and remove duplicated invariants between `test` predicates and handler bodies.
  - TODO(FRA-345): Revisit rendered provenance. Forcing providers to prepend labels such as `Reference: ...` may be the wrong layer; provenance may belong in structured metadata that the final materializer/tool renderer chooses to include.

## Open Questions

- Does `Reference` system even need to be a `Module`? Could it not use the `ConfigurationModule` system?
  - Observations:
    - In both cases, **extending behaviour requires leveraging the extension mechanism**, either thorugh `api.registerReferenceProvider` or using a `ConfigurationProvider.of`
  - Pros for seperate module:
    - The policy graph may actually be quite simple and universal. For example, there might only really be `download`, `convert`, `select` and `render` phases, so giving overly expressive control over this graph may be overkill.
  - Pros for configuration:
    - Can reuse a powerful policy graph system (i.e. questions on delegation etc can use `.compute` or `.of` in application extensions to construct the complete policy)
    - Simplifies the boilerplate of constructing primitives (no compiler etc)
- **How should resolution be split from materialization**? In short, the current policy as of May 26 is that the ReferenceProvider is in charge of both "how to turn the resource into something bufferred data (conversion, download, etc)" and also "how to turn that data into a format the agent can use". These may in fact be two seperate tasks. The question is whether there is significant room of expansion on the latter. My suspicion is that context can either be **complete** ("here it is") or **deferred** ("please manually read this if you want as it's probably very large and the user hasn't said explicitly you should read this").
  - Cases where maybe this 2 policy system is not enough:
    - **Token aware materialization**: whether you go complete or deferred depends on your context budget.
  - I would say that we should make the **ReferenceEngine** responsible for the materialization. However, given there so far there are only really 2 scenarios where we would use the Reference Engine:
    - 1. A `read_x` tool => complete
    - 2. A context bar - "what the user currently sees or has attached" => if they want deferred explicitly, you don't actually need to **materialize**. Hence, I actually think **we SHOULD materialize in the Context Engine by default**!
  - Current working answer:
    - Materialization is a runtime policy concern, not just a parser or converter concern.
    - Providers should resolve identity, access, and source facts: what resource is this, can Franklin access it, what type/size/version is it, and what source handle or bytes are available?
    - The `ReferencesEngine` should own orchestration policy: how much of a resolved reference may enter the model turn, based on runtime options such as token budget, byte limits, source type, user intent, and whether deferred/tool-based access is allowed.
    - Materializers are the execution pieces of that policy. For example, text materialization can inline a bounded range with a truncation note; PDF materialization can use a requested page range or fall back to a pointer; directory materialization can provide a shallow listing rather than recursive content.
    - In the current v1 branch, provider handlers and `toContext` collapse resolution, conversion, materialization, and rendering into one eager shortcut. That is acceptable as a spike, but docs should not describe it as the settled prompt-inclusion architecture.
    - `read_x` tools should be understood as explicit, user/model-requested materialization, not necessarily complete-resource materialization. A `read_file` or `read_pdf` call can still be bounded by lines, pages, byte limits, or other selectors.
    - A small v1 can implement materialization directly in `ReferencesEngine` options and provider handlers. A separate materializer registry only becomes necessary once reuse pressure appears, such as PDF materialization shared across filesystem files, Obsidian attachments, URLs, and MCP resources.
  - Still don't have an answer to: "**who is in charge of ensuring a massive piece of text is not injected into the context window**"
- **What is the preferred algorithm for delegation**?
  - Reason you want delegation:
    - A provider may do **part of the work**. For example, a web-fetching provider may donwload the resource, then a pdf provider can convert it.
  - Challenges:
    - **Your strategy for delegating must not assume too much about it's destination**:
      - Because the providers are introduced by independently authored extensions, that means the extension that wants to delegate does not have a particular provider in mind.
  - Solution ideas:
    - **Test Method**: Cheap predicate for determining if a provider applies, and you always go linearly through the list (so delegate means continue from here)
  - Current implementation:
    - `ReferenceHandler.test(reference)` decides whether a handler applies to the current request/data reference.
    - `ReferenceHandler.toContext(reference, delegate, runtime)` receives `delegate(reference)`, which continues after the current handler.
    - The public `Reference` remains the request shape: what the user asked for. Intermediate material is carried as `data` on the private resolved reference instead of being stuffed into `Reference.locator`.
- **Supporting of caching**:
  - Idea:
    - Have a `ReferenceCache` interface that can be added to the ReferenceEngine on construction.
    - May be used via `getCache() -> ReferenceCache | undefined` inside a provider
    - Includes way to add essentially a `locator X selector` -> `bytes` map.
    - Concrete caches can include:
      - `InMemoryReferenceCache` (for testing)
      - `FolderBackedCache` (simple)
      - `MongoDBReferenceCache` (if performance is an issue)
  - Use cases:
    - Mechanism for downloading from a url
    - Mechanism for saving results like PDF pages.
  - Observations:
    - The provider is still in charge of how the bytes are interpretted (good).
    - We need to pass bytes between delegated steps, but those bytes should not go in `Reference.locator`.
  - Current implementation:
    - The public `Reference` remains the request shape.
    - Intermediate bytes are carried in the private pipeline reference as `data`.
    - A cache can later own persisted data or derived artifacts, but cache-key design is still open.

## Old Questions:

- The `read_file` tool has a very similar initial algorithm to the filesystem reference handler. The first reference-backed implementation now lives in `referenceReadExtension`, and Obsidian composes it with reference providers instead of the old filesystem read plus separate `read_pdf` tool.
  - For example, instead of needing `PDFRead` and `EPUBRead` tools added, you could just introduce new providers that extend both:
    - `read_tool` and `readExtension`
    - `references.toContext` for programatic injection of context into prompt (for example to implement a "current context" bar that keeps track of what is being viewed in the app + what has changed since last send"
  - Challenges:
    - How do we communicate in the read tool the set of provider-specific `selectors`?
      - Current answer: provider extensions register system-prompt fragments for their selector syntax. This is simple, but it is still prompt-only; there is no structured selector capability registry yet.
