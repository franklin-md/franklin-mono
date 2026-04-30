<p align="center">
  <a href="https://franklin.md">
    <img alt="Franklin banner" src="./assets/kite2-long.png" width="100%">
  </a>
</p>
<p align="center">
  <a href="https://discord.gg/FzWcEJfe"><img alt="Discord" src="https://img.shields.io/badge/discord-community-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
<a href="https://github.com/franklin-md/franklin-mono/actions/workflows/release-obsidian.yml">
  <img alt="Release Obsidian Plugin" src="https://github.com/franklin-md/franklin-mono/actions/workflows/release-obsidian.yml/badge.svg?branch=main" /></a>
</p>

# Franklin
Meet Franklin, your **provider-agnostic** Obsidian agent. Right now, Franklin supports [OpenAI subscriptions](https://openai.com/codex/) and [OpenRouter](https://openrouter.ai) API keys.

## Table of contents
- [BYOK/S philosophy](#byoks-philosophy)
- [Features](#features)
- [Roadmap](#roadmap)
- [License](#license)

## BYOK/S philosophy
We believe in BYOK/S: bring your own _keys_ or _subscription_.
- Conversation history stays on your machine;
- Power the agent with any supported model, either via a subscription or an API key;
- The agent stays the same, even if the underlying LLM model changes.

A new top model might be released every month, but your Franklin agent doesn't care. **We believe agent harnesses shouldn't be chains.** ⛓️‍💥

## Features

### ✏️ Making changes
Franklin proposes changes to your vault: it can add, modify, or delete files.

![diff](./assets/change.png)

### ⚡️ Model agnostic
Swap LLM providers mid-conversation. Everything else stays the same.
![models](./assets/models.png)

### 🔐 Secure by design

The agent's default permissions are:
- broad read access across the filesystem;
- narrow write permissions: the agent can write only within your vault root and `/tmp`.

🔧 We are actively working towards making filesystem permissions **configurable**. See [Roadmap](#roadmap).
> [!IMPORTANT]
> The model has access to a `grep` tool that it uses for keyword searches within files. By default, we try to run this in a **sandboxed environment** with the same read and write access described above. The sandbox requires `ripgrep` to be installed on your computer (see [installation instructions](https://ripgrep.dev/download/)).
>
> If you are on Windows or do not have `ripgrep` installed, `grep` will run with unrestricted access. However, in most cases, the agent will not search for words outside your vault. Improving the agent's security is still a work in progress.

## Roadmap

### 🤖 LLM support

We plan to add broader LLM provider support, including but not limited to:
- Subscriptions:
    - GitHub Copilot
    - Google Gemini CLI
    - Google Antigravity

- API keys:
    - Anthropic
    - OpenAI
    - Azure OpenAI
    - DeepSeek
    - Google Gemini
    - Google Vertex
    - Amazon Bedrock
    - Mistral
    - Groq
    - Cerebras
    - Cloudflare Workers AI
    - xAI
    - Vercel AI Gateway
    - ZAI
    - OpenCode Zen
    - OpenCode Go
    - Hugging Face
    - Fireworks
    - Kimi For Coding
    - MiniMax

### Permission system

Give users the ability to set **read and write restrictions** for Franklin, so you can be sure it will not snoop around.

### 🖥️ Bash command
Make the agent more powerful for research by allowing it to use a terminal. We are actively looking into designing a secure and safe approach for general usage.

## License

Copyright 2026 Franklin contributors.

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).
