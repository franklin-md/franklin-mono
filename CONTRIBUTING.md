# Contributing to Franklin

ℹ️ This section is a work-in-progres.

### Fresh Checkout Setup

Use Node.js 22 or newer and install dependencies from the committed lockfile:

```sh
npm ci
```

Maintainers currently use npm 11.6.2. Keep the npm version documented here rather than pinning it with `packageManager`, because the Obsidian review bot runs `pnpm install` during plugin review.

Use `npm install` only when intentionally adding, removing, or updating dependencies and committing the resulting `package-lock.json` change.

### Before PR/Merge

- Ensure no-dead code paths:
  - Dead if not exported from package and not consumed within package other than tests
  - Not dead if exported from package, but PR must mention change to package API. Less important for core code packages, but very important for top-level sdks like `agent`
- Local Git hooks:
  - `pre-commit` runs `npm run format` across the repo
  - `pre-push` runs `npm run check`
  - Hooks install via `npm ci`, `npm install`, or `npm run prepare`
  - Skip once with `git commit --no-verify` or `git push --no-verify`
- GitKraken/macOS note:
  - Husky works in GitKraken, but GUI apps may not inherit your shell's Node version manager setup
  - If GitKraken cannot find `node` or `npm`, add your version manager init to `~/.config/husky/init.sh`
