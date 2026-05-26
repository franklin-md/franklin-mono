# Reference System

## Current Scope

The reference module is the first application-side context materialization surface in `@franklin/agent`.

The v1 contract is intentionally small:

- Extensions register `ReferenceHandler` implementations by reference `type`.
- `runtime.references.toContext(reference)` resolves one reference into `ReferenceContext`.
- `ReferenceContext` only contains Mini-ACP user content.
- The runtime returns model-visible unavailable text when a handler is missing or fails.
- Built-in handlers cover text documents, filesystem files, and a placeholder PDF response.

This gives callers a minimal way to inject app-owned context into a prompt without changing the Mini-ACP prompt protocol.

## Deferred Design

The following concerns are important, but deliberately out of the first implementation.

### Delegation, Cycles, and Depth

Filesystem references currently call `ctx.references.toContext(...)` to reuse the text and PDF handlers. That is enough for v1, but it does not model delegation as first-class behavior.

Future delegation support should decide:

- whether `ReferenceEngine` should expose an explicit `delegate(...)` method;
- whether delegation should carry `from` and `to` reference edges;
- how to detect cycles and enforce depth limits;
- whether cycle and depth failures should produce model-visible content, structured diagnostics, or both.

One possible implementation is a resolver stack that records the current reference chain and rejects repeated keys. That was intentionally left out until there is a real caller for recursive reference graphs.

### Provenance

The v1 context type does not report where output came from after materialization.

Future provenance support should likely preserve:

- the original submitted reference;
- the handler that resolved it;
- any delegated references;
- source metadata such as URI, version, fingerprint, or selector.

That data should be kept distinct from model-visible content so transcript and debug rendering can show what happened without forcing every detail into the prompt.

### Diagnostics

The v1 runtime turns missing handlers and thrown handler errors into plain text content. That keeps the first implementation simple and prevents bad references from failing the whole prompt path.

Future diagnostics should define a structured error surface for:

- invalid locators or selectors;
- missing or denied resources;
- unsupported media types;
- materialization limits;
- stale bindings;
- handler failures.

Diagnostics may need separate handling for user-visible UI, transcript/debug views, and model-visible fallback content.

### Materialization Policy

Handlers currently decide directly how to turn a source into Mini-ACP content. That is simple, but it will not be enough for larger files, binary formats, provider-specific selectors, or model-specific capabilities.

Future materialization policy should decide when to:

- inline text;
- attach images or other supported media;
- summarize or truncate;
- expose a tool-readable pointer;
- reject or defer a source;
- cache extracted content.

This policy probably belongs between reference resolution and final content construction, not inside every provider.

### Built-In Handler Limits

The current filesystem handler assumes files without detected magic bytes are text and routes PDFs to a placeholder PDF handler. Real PDF extraction, EPUB handling, notebooks, spreadsheets, and other document formats are explicitly out of scope for v1.

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
