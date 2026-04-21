#### Agents.Md as Standard

This UX support was re-implemented in 2024/2025 by each application providing agent implementations with slight variations:

- **In Name**:
    - .cursorrules
    - CLAUDE.md
    - GEMINI.md
    - AGENTS.md
- **In Location**:
    - Resolved within
        - `./.claude`
        - `./.github`
        - `.`
- **In Format**:
    - Markdown text only
    - Markdown + YAML frontmatter (to support additional mechanisms like conditional activation)

In order to support **portability of project instructions across applications**, there was an ecosystem-wide standardization towards a common convention:

- `AGENTS.md` for name
- [ ] `.` for location?
- Markdown prose for format

Most applications now support specifying instructions via this standard (with the notable exception of Anthropic who prefer a `CLAUDE.md` only convention), with their old system existing primarily as backward-compatability.