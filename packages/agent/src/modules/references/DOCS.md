# Reference System

## Current Scope

The reference module is the first application-side context materialization surface in `@franklin/agent`.

The v1 contract is intentionally small:

- Extensions register ordered `ReferenceHandler` implementations.
- Each handler provides a cheap `test(reference)` predicate. The engine calls handlers in registration order and uses the first match.
- `runtime.references.toContext(reference)` starts a private pipeline with the request `Reference`.
- Inside a handler, `delegate(reference)` continues resolution after the current handler. This keeps delegation monotonic rather than re-entering the global resolver from the beginning.
- `Reference.type` is a provider-owned kind or intended consumption mode, not a MIME type.
- `Reference.locator` is a stable origin identity string interpreted by the selected provider.
- `Reference.selector` is a provider-local selection string.
- `Reference.label` is an optional display alias and not part of reference identity.
- The internal pipeline reference may carry `data` produced by an earlier handler. The first data shape is bytes plus optional MIME metadata.
- Selector codec helpers provide compact `key=value;key=value` syntax for providers that want shared parsing without shared selector semantics.
- `ReferenceContext` only contains Mini-ACP user content.
- The runtime returns model-visible unavailable text when a handler is missing or fails.
- Built-in provider extensions cover text documents, filesystem files, and a placeholder PDF response.

This gives callers a minimal way to materialize app-owned context without changing the Mini-ACP prompt protocol. It is not yet the final prompt-inclusion policy for when and how that content should enter a model turn.

## Reference Identity

`Reference` is the public request shape: what a caller or capture layer says the user referred to. `ResolvedReference` is the internal provider-facing shape used while the ordered handler chain runs.

- `type` names the provider-owned reference kind or requested interpretation. It can overlap with file type names when that is useful, but it is not a MIME type and should not be inferred only from bytes.
- `locator` is the stable origin identity. A filesystem provider can resolve it to an absolute path, and a future URL provider can download or cache it, but those implementation artifacts should not replace the locator while delegating.
- `selector` is interpreted by the handler that consumes it. Shared selector helpers only provide syntax; they do not make all providers share selector semantics.
- `label` is a display alias for rendered context and UI. It should not participate in resolution, cache identity, or equality decisions.
- `data` is intermediate resolved material, currently bytes plus optional MIME metadata. It exists so a loader can delegate to a renderer without stuffing bytes, cache handles, or derived artifacts into `locator`.

Future cache keys should be explicit. They may include `type`, `locator`, `selector`, provider/version metadata, and transformation details, but should not depend on `label`.

## Deferred Design

The following concerns are important, but deliberately out of the first implementation.

### Delegation, Cycles, and Depth

Filesystem references currently read bytes, attach them to the private pipeline reference, and call `delegate(...)` to let later handlers decide whether they can render those bytes as text, PDF, or another source type. That is enough for v1, but it only models ordered monotonic delegation.

Future delegation support should decide:

- whether delegation should carry explicit `from` and `to` reference edges;
- whether the current ordered-chain algorithm is sufficient for all provider composition;
- how to enforce fanout, depth, and output limits;
- whether cycle and depth failures should produce model-visible content, structured diagnostics, or both.

The current ordered-chain algorithm prevents circular recursion structurally because `delegate(...)` resumes after the current handler. A future resolver stack may still be useful for provenance, fanout accounting, and diagnostics.

## Open Questions

- The `read_file` tool has a very similiar initial algorithm to the fileystemReferenceHandler. This could suggest that the read extension should depend on the reference system, and use that to resolve the files? That seems appropriate as it allows for extending the policy for how different file types should be read.
  - For example, instead of needing `PDFRead` and `EPUBRead` tools added, you could just introduce new providers that extend both:
    - `read_tool` and `readExtension`
    - `references.toContext` for programatic injection of context into prompt (for example to implement a "current context" bar that keeps track of what is being viewed in the app + what has changed since last send"
  - Challenges:
    - How do communicate in the readTool the set of provider specifici `selectors`?
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
