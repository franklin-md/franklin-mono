

- **Never Refreshes**
- Discovery:
    - Global:
        - Searches `~/.codex` unless you provide a different home (`CODEX_HOME`)
        - First checks for `AGENTS.override.md` then `AGENTS.md`, taking the first non-empty. Only file is taken from this level
    - Project:
        - Walk-Down from Project root to CWD (defaulting to project root = cwd if no project dir can be found (i.e. no git repo))
        - Checks for `AGENTS.override.md` then `AGENTS.md`, only taking 1 per directory.
- Merge:
    - "Codex concatenates files from the root down, joining them with blank lines. Files closer to your current directory override earlier guidance because they appear later in the combined prompt."
    - Truncatation mechanism, at 32kb by default