# Franklin — personal study build

This is a private, personal build of [Franklin](https://github.com/franklin-md/franklin-mono), adapted for studying in Obsidian. An experimental workspace for my own workflows, not a separately supported product.

The first experiment is a question inbox: capture a passage or type a question, keep reading while an agent answers, then scan short answers and follow up without losing the source. Questions appear newest first, grouped by day. The inbox uses one agent per question, a model choice, and concurrent processing.

## Current stage

The Obsidian plugin includes a functional inbox: real Franklin agents, saved questions and answers, selection capture, follow-up branches, source navigation, and retries. Questions carry current-note context and parent-list breadcrumbs; agents can read files and research the web. Click one question to see its full answer and follow-up field. Configure a provider in Franklin settings, then run **Franklin: Open study inbox**. Assign a hotkey to **Franklin: Add selection to study inbox** for quick capture.

Inbox data lives in one `inbox.json` file in the plugin directory; question agents keep their transcripts in memory. Existing chat uses the original runtime. Harness migration will be assessed after using the inbox.

Storybook retains a visual demo with simulated answers:

```bash
npm install
npm run storybook -w @franklin/obsidian
```

Open **Obsidian → Inbox → Workspace** to review capture, insertion, expansion, follow-up lineage, model selection, concurrent processing, failure/retry, and deletion. **Sidebar** and **Wide feed** show different widths. Storybook's toolbar switches the Obsidian light and dark themes. Preview state resets on reload.

See [the working inbox guide and architecture](docs/inbox-prototype.md).

## Development

Requires Node 22+ and npm 11.10+.

```bash
npm run build
npm run lint
npm run format:check
npm test
npm run bundle -w @franklin/obsidian
```

See [the Obsidian package README](apps/obsidian/README.md) for plugin development and installation. This workspace retains upstream package names and infrastructure for experimentation.

## Attribution and license

Based on Franklin by the Franklin contributors. Original copyright notices and the [Apache 2.0 license](LICENSE) are retained.
