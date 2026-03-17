# TODOs — Deferred Work Including. Before Grant Release

## Packages

### agents:

- [ ] The AgentConnection should not show AgentCommands (that is ACP wire level details). It should show a different interface
- Codex:
  - https://github.com/cola-io/codex-acp
  - https://github.com/zed-industries/codex-acp
  - [ ] Instead of using codex-core ACP adapters, we could use the new app-server protocol and create an adaptor for that!
- [ ] Checking for availability (is the packages installed, should we install them ourselves, and how do we cope with different versions)
- [ ] Not sure about authentication flow.
- Environments:
  - Demo provisioning a worktree environement

### libs:

- [ ] Can we define a Codec abstraction to support JSONL and other specific encoding of data sent across transport (vs hard coding?). For example, HttpCallbackServer really hard codes this.

## Packaging / Publishing

- [ ] Setup type declartion and exporting (especially for Browser Contexts)
- [ ] Before publishing any package to npm: evaluate whether to strip `sourceMap` / `inlineSources` from `tsconfig.base.json` (or override per package) to avoid shipping source content in dist artifacts

## Testing

- [ ] Basically all AI generated. we need to refactor etc
