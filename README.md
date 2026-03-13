# Franklin

A middleware stack for ACP-compliant coding agents.


## Beliefs
- The next generation of applications will be built on top of existing agents, as opposed to LLMs, with LLM consumption being charged only by the provider, not the application (end of AI app rent)
- Agentic Runtimes should be minimal and up to the calling code to extend behaviour
- Useful AI should be cheap and cost no more than a cup of coffee a day.

## Vision:
- **General**
- **File Over App**

## What is this?

You already use Claude Code, Codex, Goose, Gemini CLI. Franklin lets you **extend and orchestrate** them from your own application.

Franklin builds on the [Agent Client Protocol (ACP)](https://agentclientprotocol.com) — the industry standard for client-to-agent communication. Instead of reinventing the wire protocol, Franklin provides middleware that adds capabilities to the raw ACP connection:

- **History** — full bidirectional conversation capture, persistence, replay
- **Modules** — composable units that inject MCP tools, environment config, and prompt context
- **Permissions** — declarative policies that auto-resolve permission requests by tool kind

## Quick example [placeholder - to do later]

```typescript
import { franklin } from 'franklin';

const agent = await franklin.spawn({
  agent: 'claude-acp',
  cwd: '/my-project',
  modules: [todoModule, memoryModule],
  permissions: { read: 'allow', execute: 'confirm' },
  history: true,
});

agent.on((event) => console.log(event));
await agent.prompt('Build a REST API for the todo list');
```



## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

```
App
  └─ AgentHandle
       └─ Middleware stack (history, modules, permissions)
            └─ ACP ClientSideConnection
                 └─ Agent subprocess (claude-acp, codex-acp, goose, ...)
```

## Packages

| Package         | Purpose                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| `franklin`      | Core: spawn factory, middleware stack, handle, modules, history, permissions |
| `@franklin/tui` | Demo TUI app                                                                 |

## Development

```bash
npm run build            # tsc -b
npm run lint             # eslint . --cache --max-warnings=0
npm run test             # runs vitest in each workspace
npm run format           # prettier --write .
npm run dev -w @franklin/tui   # TUI in dev mode
```
