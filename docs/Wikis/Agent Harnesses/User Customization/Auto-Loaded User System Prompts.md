
Part of [[User-Defined Agent Extensions]].

It is common for a user to want the agent to load the same prompt into it's system context on each session. The user would **define their prompt as a markdown file somewhere within their project's filesystem** and then **expect this to be loaded automatically in each conversation**. Examples of common project instructions across coding and personal agents include:

- Behaviour Cues and Instructions
    - Build/test/lint commands
    - Workflows
- Project Context:
    - Structure
    - Code style conventions and naming patterns
    - PR/commit conventions
    - Security-sensitive areas to avoid
- Known **gotchas**
- Identity and Personality
    - [ ] Soul?

In order to support this, the agent harness must:

- Collect, order and decide the final prompt to be automatically included given the filesystem
- Send that prompt as part of the system prompt on each new session.

[[Agents.Md as Standard]]

#### Memories

An **agent-managed explicit-memory system**, in which the agent saves context to the filesystem with the expectation for it to be reloaded in future conversations, could in theory be implemented in this system.

However, this mechanism is focused on **user-defined** not **agent-defined** context, and for that reason might preferably be solved independently (although could obviously reuse some of the same resolution logic)

#### Resolution Algorithm

`resolve: (Filesystem)->string`

The algorithm is parameterized by:

- **Collection Strategy**: How do instruction files get discovered?
    - How do you distinguish an instruction file from a regular file?
    - How do you find folders that may have instruction files in them?

## **Precedence Strategy**:

##### Collection Algorithms:

`collect: (Filesystem) -> paths[]`

Common strategies include:

- **Walk Up**:
    - Start from current working directory
    - Find files matching name conventions like `AGENTS.md` or sub-folder conventions like `.github/copilot-instructions.md` along the way
    - Can stop at root OR stop at a defined boundary (like git project root)
- **Fixed Paths**:
    - Search from only a specific set of folders like:
        - cwd
        - `~`

##### Scoping Algorithms

Instruction files may be:

- Shared among all team members in a project
- Defined for and by a single member for that project
- Defined by a single member for use across all projects

It is for this reason that **multiple instruction files even for the same standard** may be found in collection.

`select: (paths[]) -> string` may decide:

- Order paths by precedent
    - May consider a **classification of instructions** by personal, project, and global.
- How the content of these paths gets converted to the final prompt
    - **Combine All** with flexibility in how each individual prompt is rendered.
        - Instruct later concatenations to be treated as overrides of earlier.
    - **Highest Priority wins**
- Any additional processing on that prompt:
    - **Optional Truncation**

For selecting across multiple standards, the hybrid algorithm must also figure out how to **prioritize standards**. For example, if the user has project level AGENTS.md and CLAUDE.md, which of these must be used for a non Codex and Claude Code harness?

##### Freshness

During a session, the contents of the resolved instructions may change. The system prompt used on next turn may be either be:

- **Automatically refreshed** on next turn
- **Never refreshed**
    - Edits to instructions only get effectively picked up on session created after those edits.
- **Refreshed only on Compaction**

[[CLAUDE.md Instructions]]

[[Codex's AGENTS.md]]