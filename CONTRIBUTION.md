# Before PR/Merge

- Ensure no-dead code paths:
  - Dead if not exported from package and not consumed within package other than tests
  - Not dead if exported from package, but PR must mention change to package API. Less important for core code packages, but very important for top-level sdks like `agent`
- Local Git hooks:
  - `pre-commit` runs `npm run format` across the repo
  - `pre-push` runs `npm run check`
  - Hooks install via `npm install` or `npm run prepare`
  - Skip once with `git commit --no-verify` or `git push --no-verify`
- GitKraken/macOS note:
  - Husky works in GitKraken, but GUI apps may not inherit your shell's Node version manager setup
  - If GitKraken cannot find `node` or `npm`, add your version manager init to `~/.config/husky/init.sh`
