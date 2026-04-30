# Contributing to Franklin

ℹ️ This section is a work-in-progres.

### Before PR/Merge

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

### Memory-budgeted builds (opt-in)

When multiple AI agents (Claude Code / Superconductor sessions) run on separate worktrees of this repo, concurrent `npm run build` / `test` / `lint` invocations can OOM low-RAM machines. The `build`, `test`, `lint`, and workspace `typecheck` scripts are wrapped with `scripts/in-parallel.mjs`, which declares an estimated MB budget per task and queues invocations across every shell on the machine (state lives in `$TMPDIR/franklin-in-parallel.json`).

**Gating is off by default** — the wrapper is a transparent pass-through until you explicitly opt in. CI and Windows contributors get the old behaviour with no configuration.

**Opting in.** Either:

- Set an explicit budget in your shell rc: `export FRANKLIN_MEM_BUDGET_MB=6000`.
- Or enable autodetect (uses 60% of `os.totalmem()`): `export FRANKLIN_MEM_AUTODETECT=1`.

**Verbose mode** prints a line to stderr whenever a task is queued:

```sh
FRANKLIN_INPARALLEL_VERBOSE=1 npm run build
```

**Calibrating the `--mb` values.** Use the sibling estimator:

```sh
node scripts/memory-estimate.mjs -- npm run build -w @franklin/agent
# → [memory-estimate] summary (npm): peak=852MB → recommended --mb 1000
```

Drop the recommended value into the matching script in that workspace's `package.json`. The wrapper pads every `--mb` by +100 MB at runtime to cover npm/node overhead, so you don't need to add margin yourself. For more confidence run multiple times: `--runs 3` reports min/max/mean/p95. POSIX only; Windows contributors should skip calibration and use the committed defaults.

**Troubleshooting.** If the state file gets wedged (diagnostics look weird, phantom entries):

```sh
rm "$TMPDIR/franklin-in-parallel.json"
```

Stale entries from SIGKILL'd wrappers are normally pruned on the next acquire via a PID liveness probe, so manual cleanup should be rare.

**Caveat.** If a wrapped script internally invokes another wrapped script, both count against the budget. The current script graph avoids this: root `build`/`test`/`lint` are single processes; root `typecheck` is a fan-out across workspaces (each fan-out target wraps independently). Revisit if adopting Turborepo or similar at root.
