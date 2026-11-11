# `@franklin/extension-mcp`

Remote MCP tools for Franklin, using the official TypeScript client over
Streamable HTTP. The host owns saved connection configuration and credentials;
each agent owns its remote clients. No search-result cache is installed.

```ts
import { MCPConnections } from '@franklin/extension-mcp';
import { createMCPFetch } from '@franklin/node';

const connections = new MCPConnections({
 getServers: () => app.settings.get().mcpServers,
 getCredential: id => app.auth.getApiKey(id),
 subscribeConfiguration: notify => app.settings.subscribe(notify),
 subscribeCredentials: notify => app.auth.onAuthChange(id => notify(id)),
 createFetch: createMCPFetch,
});

// Add to chat or explicit task extensions:
connections.extension();
// For ordinary study questions: only explicitly selected Exa search/fetch tools.
connections.extension('research');
```

Call `await connections.dispose()` when the host unloads. Connection tests use
`testConnection(id, signal)` and perform initialization/discovery only. A connected
Exa server with a configured key does not prove the key was verified, because Exa
also offers keyless access.

`createExaConnection()` supplies the documented endpoint, secret header slot and
search-tool selections. Configure the key through `AuthManager`; never place it
in settings, endpoint query parameters, tool arguments or model prompts. Static
custom headers are supported, including `Authorization`. OAuth and local stdio
servers are outside this release.

Tools are prepared before a prompt, including in restored agents. Configuration
changes appear before the next prompt; disabling/removing a connection or rotating
its key retires the old client immediately. Schemas stay fixed during a turn.
Remote tool names receive stable, bounded Franklin names. Raw object JSON Schemas
are validated with AJV, including local references, without conversion through
Zod. External references and unsupported dialects are rejected.

The injected transport must implement streaming WHATWG fetch. The Node adapter
checks the current environment permissions on every request, caps responses at
8 MiB, and rejects redirects. Tool results are separately limited to 4 MiB.
The client advertises no sampling, elicitation or resource capabilities. Text,
supported images and structured JSON are rendered; other content gets an explicit
unsupported marker, without fetching resource links.

Discovery is limited to 15 seconds. Tool calls have a two-minute timeout and are
not automatically resubmitted on an ambiguous failure. If Exa returns a research
run ID, continue that run. Local cancellation does not promise remote job
cancellation. No unattended polling or background-job recovery is provided.

See [the Obsidian guide](../../../docs/mcp.md),
[Exa MCP](https://exa.ai/docs/get-started/exa-mcp), and the
[official client SDK](https://ts.sdk.modelcontextprotocol.io/v2/clients/connect).
