# Getting Started: Writing an Extension

An extension gives the agent new tools to call and lets you inject context into every prompt. It's a plain class that implements `Extension` from `@franklin/agent`.

---

## 1. Create the extension class

Create a file in `packages/agent/src/extensions/examples/your-extension/extension.ts`:

```ts
import { z } from 'zod';
import { createStore } from '../../../store/index.js';
import type { Store } from '../../../store/index.js';
import type { Extension, ExtensionAPI } from '../../types/index.js';

export class MyExtension implements Extension {
  readonly name = 'my-extension';

  // Reactive store — holds state that your UI can subscribe to
  readonly items: Store<string[]> = createStore<string[]>([]);

  async setup(api: ExtensionAPI): Promise<void> {
    // Register tools the agent can call
    api.registerTool({
      name: 'add_item',
      description: 'Add an item',
      schema: z.object({ text: z.string() }),
      async execute({ text }) {
        this.items.set((draft) => { draft.push(text); });
        return { ok: true };
      },
    });

    // Inject context into every prompt the user sends
    api.on('prompt', async (ctx) => {
      const list = this.items.get().join(', ');
      if (!list) return undefined; // pass through unchanged
      return {
        prompt: [{ type: 'text' as const, text: `Items: ${list}` }, ...ctx.prompt],
      };
    });
  }
}
```

The three hooks available on `api` are:

| Hook | When it fires | Can transform? |
|---|---|---|
| `sessionStart` | New/loaded session | Yes — can modify `cwd`, `mcpServers` |
| `prompt` | Every user message | Yes — can prepend/modify content blocks |
| `sessionUpdate` | Streaming agent output | No — observe only |

---

## 2. Register it in the session

In `apps/demo/src/renderer/src/pages/agent-chat/use-agent-session.ts`, add your extension alongside the existing ones:

```ts
import { MyExtension } from '@franklin/agent/browser';

// Inside useAgentSession():
const myExt = useRef(new MyExtension()).current;

const middleware = await framework.compileExtensions([
  conversationExt,
  todoExt,
  myExt,        // <-- add here
]);
```

Then add it to the return value so the UI can access the store:

```ts
return { commands, sessionId, todoExt, conversationExt, myExt, status, error };
```

---

## 3. Bind the store to your UI

The `Store<T>` is compatible with React's `useSyncExternalStore`:

```tsx
import { useSyncExternalStore } from 'react';

function MyPanel({ ext }: { ext: MyExtension }) {
  const items = useSyncExternalStore(
    (cb) => ext.items.subscribe(cb),
    () => ext.items.get(),
  );

  return <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}
```

---

## How it fits together

When the agent calls `add_item`, the tool's `execute` function mutates the store. The store notifies React, which re-renders your panel — all without any wiring beyond `compileExtensions`. The middleware handles routing the tool call from the agent subprocess back to your extension automatically.
