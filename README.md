<p align="center">
  <a href="https://franklin.md">
    <img alt="Franklin banner" src="./assets/kite2-long.png" width="100%">
  </a>
</p>
<p align="center">
  <a href="https://discord.gg/KRFy6ECMnf"><img alt="Discord" src="https://img.shields.io/badge/discord-community-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
<a href="https://github.com/franklin-md/franklin-mono/actions/workflows/release-obsidian.yml">
  <img alt="Release Obsidian Plugin" src="https://github.com/franklin-md/franklin-mono/actions/workflows/release-obsidian.yml/badge.svg?branch=main" /></a>
</p>

# Franklin
> Meet **🪁 Franklin**, your personal AI agent for Obsidian. Franklin reads your vault, helps you think through notes, and proposes reviewable changes to your Markdown files.

Franklin is **provider-agnostic**, and currently supports you bringing your [OpenAI Plus/Pro subscriptions](https://openai.com/codex/) and [OpenRouter](https://openrouter.ai) API keys. 

Franklin's core local experience is **free**. Features that can run purely on your machine are intended to remain free.

Franklin starts as an Obsidian plugin, but the project is also building **open agent infrastructure** that can be embedded into other applications. To learn more or contribute to the broader effort, see [Motivation](#motivation).


## Table of contents
- [Getting Started](#getting-started)
- [Features](#features)
- [Roadmap](#roadmap)
- [Motivation](#motivation)
- [License](#license)

## Getting Started
1. Install the Franklin Obsidian plugin.
2. Choose and authenticate with a model provider in settings or from the model selector.
3. Start talking with Franklin to read, search, or edit notes in your vault.
4. Review proposed file changes before accepting them.
  
Franklin is currently in **early release**. Join the [Discord](https://discord.gg/KRFy6ECMnf) to follow and support development!

## Features

### ✏️ Making changes
Franklin proposes changes to your vault: it can add, modify, or delete files.

![diff](./assets/change.png)

### ⚡️ Model agnostic
Swap LLM providers mid-conversation. Everything else stays the same.
![models](./assets/models.png)

### 🔐 Sandboxed filesystem access
On Mac and Linux, agents have restricted permission on what they may see and edit:
- broad read access across the filesystem, except for .env files and the .obsidian folder
- narrow write permissions: the agent can write only within your vault root and `/tmp`.

We are actively working towards making filesystem permissions **configurable** and robust. 
> [!IMPORTANT]
> The model has access to a `grep` tool that it uses for keyword searches within files. By default, we try to run this in a **sandboxed environment** with the same read and write access described above. The sandbox requires `ripgrep` to be installed on your computer (see [installation instructions](https://ripgrep.dev/download/)).
>
> If you are on Windows or do not have `ripgrep` installed, `grep` will run with unrestricted access. However, in most cases, the agent will not search for words outside your vault. Improving the agent's security is still a work in progress.

### And lots more!

- Web search and page fetch
- Persistent conversations
- Multiple conversations in parallel
- Project instructions via `CLAUDE.md`
- Per-turn token tracking
- Forking last turn into a new conversation

## Roadmap
Below is a list (in approximate priority) of what we are building:
- Support for other subscriptions and api providers such as Anthropic and OpenCode
- Greater parity with popular coding agents like Claude Code, including:
  - Sub-Agents
  - Terminal
  - MCP
  - AGENTS.md
  - Skills
  - Context Compaction
  - Branching at any point in conversation
  - Conversation rewind
- `@`-style mention system
- PDF Support
- Image Support
- Integrations with popular platforms like:
  - Twitter/X  
- Conversation Organization:
  - Hierchical viewe
  - Auto-named conversations
- Better usage tracking:
  - Chat costs
  - Cost budgets  

## Motivation

## BYOK/S philosophy
We believe in BYOK/S: bring your own _keys_ or _subscription_.
- Conversation history stays on your machine;
- Power the agent with any supported model, either via a subscription or an API key;
- The agent stays the same, even if the underlying LLM model changes.

A new top model might be released every month, but your Franklin agent doesn't care. **We believe agent harnesses shouldn't be chains.** ⛓️‍💥


## Disclosures
Franklin 

## License

Copyright 2026 Franklin contributors.

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).
