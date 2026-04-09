---
description: Comprehensive code cleanliness review of branch changes. Auto-triggers after completing implementation work, or invoke manually with /code-clean. When self-initiated, auto-resolves mechanical issues. When user-initiated, presents findings visually without making changes.
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(git status:*), Bash(git merge-base:*), Bash(wc:*), Glob, Grep, Read, Edit, TodoWrite
disable-model-invocation: false
---

# Code Clean: Cleanliness Review

Review all changes on the current branch for code cleanliness issues introduced by the work.

## Determine Mode

Check how this skill was triggered:

- **Self-initiated** (you decided to run this after completing implementation work): Auto-resolve all fixable issues silently. Present a brief summary of what was cleaned and flag items that require attention.
- **User-initiated** (user ran `/code-clean`): Present ALL findings visually with before/after diffs grouped by category. Do NOT make any changes.

## Setup

1. Identify the base branch: `git merge-base HEAD origin/main`
2. Get the full diff: `git diff $(git merge-base HEAD origin/main)...HEAD`
3. Get the list of changed files: `git diff $(git merge-base HEAD origin/main)...HEAD --name-only`
4. Get added files: `git diff $(git merge-base HEAD origin/main)...HEAD --name-only --diff-filter=A`
5. Get deleted files: `git diff $(git merge-base HEAD origin/main)...HEAD --name-only --diff-filter=D`
6. Read the project's CLAUDE.md (if present) for naming conventions and project-specific rules

## Checks

Run all checks against the branch diff. For each finding, classify it as either **Auto-resolve** or **Requires attention**.

---

### Category 1: Dead Code [Auto-resolve]

These are mechanical removals. In self-initiated mode, fix them directly.

**1.1 Unused imports**
- For each changed file, check that every imported symbol is actually referenced in the file body.
- Grep for each import name. If zero matches beyond the import line, flag it.

**1.2 Unused exports**
- For each new or modified `export` in changed files, grep the entire codebase for that symbol.
- If no other file imports it, and it's not a package entry point, flag it.

**1.3 Orphaned files**
- For each newly added file, grep the codebase for imports of that module path.
- If nothing imports it and it has no side effects (not a test, not an entry point, not a config), flag it.

**1.4 Unreachable code**
- Scan changed functions for code after `return`, `throw`, `break`, `continue`.
- Check for impossible branches (e.g., `if (false)`, conditions that contradict earlier guards).

**1.5 Stale test files**
- Cross-reference deleted exports/modules with test files.
- If a test file imports something that was deleted in this branch, flag it.

---

### Category 2: Refactoring Completeness [Auto-resolve]

These are incomplete mechanical refactors. In self-initiated mode, complete them.

**2.1 Incomplete renames**
- For each symbol that was renamed in the diff (old name removed, new name added), grep the codebase for lingering uses of the old name.
- Ignore comments, strings, and git history references.

**2.2 Orphaned type definitions**
- For each type/interface in changed files, grep the codebase for references.
- If a type is only referenced by its own definition, flag it.

**2.3 Stale re-exports**
- Read barrel/index files in directories that had changes.
- Check that every re-exported symbol still exists in the source file.

**2.4 Broken internal references**
- For each import in changed files, verify the target module actually exists on disk.
- Check that named imports match actual exports of the target.

**2.5 Half-finished migrations**
- Within changed files, detect if both an old pattern and its replacement coexist (e.g., both `require()` and `import`, both callback and promise style).

---

### Category 3: Temporary Artifacts [Requires attention]

These need human judgment. Always flag, never auto-fix.

**3.1 Console statements**
- Grep the diff for added `console.log`, `console.debug`, `console.warn`, `console.error`, `console.info`.
- Exception: files that are explicitly logging utilities.

**3.2 Debugger statements**
- Grep the diff for added `debugger` keywords.

**3.3 Commented-out code**
- Detect blocks of commented-out code (2+ consecutive lines of commented JS/TS syntax).
- Distinguish from prose comments — look for code-like patterns: `//  const`, `//  return`, `//  if (`, `/*  function`.

**3.4 New TODOs**
- Grep the diff for added `TODO`, `FIXME`, `HACK`, `XXX`, `TEMP`.
- Flag each one with its full text and location.
- This is **informational** — report that these were added so the developer is aware. Not necessarily a problem.

**3.5 Temporary/scratch files**
- Check added files for patterns: `.DS_Store`, `*.bak`, `*.tmp`, `temp.*`, `test.ts` (bare), `scratch.*`, `*.orig`.

---

### Category 4: Naming & Convention Consistency [Auto-resolve]

Mechanical convention enforcement. In self-initiated mode, fix them.

**4.1 File naming conventions**
- Check new files against the project's convention from CLAUDE.md (typically lower-kebab-case).
- Flag files that don't match.

**4.2 Redundant path segments**
- Flag new files where the filename repeats the parent directory name (e.g., `block/block-text.ts` should be `block/text.ts`).

**4.3 Import style**
- Check that `import type` is used for type-only imports.
- Check that `.js` extensions are present on relative imports (for ESM projects).

**4.4 Export style**
- Flag barrel re-exports from subfolders if the project convention discourages them.
- Flag unnecessary re-exports of symbols from other packages.

**4.5 Naming consistency**
- Read sibling files in directories with new files. Check that new symbol naming (functions, classes, constants) follows the same casing/style conventions as siblings.

---

### Category 5: API Surface Changes [Requires attention]

These affect consumers and need human review. Always flag with before/after.

**5.1 Changed function signatures**
- Detect exported functions where parameters were added, removed, reordered, or had type changes.
- Show the before/after signature.
- Grep for call sites to show impact.

**5.2 Changed return types**
- Detect exported functions where the return type changed.
- Show before/after and list callers that destructure or depend on the shape.

**5.3 Removed exports**
- Detect symbols that were exported before but are no longer.
- Grep for consumers. Show which files still try to import them.

**5.4 Changed type shapes**
- Detect fields added/removed/modified on exported types and interfaces.
- Show before/after diff of the type.

**5.5 Breaking enum changes**
- Detect enum values removed or reordered.
- Show before/after.

---

### Category 6: Scope Discipline [Requires attention]

These may indicate accidental changes. Always flag.

**6.1 Unrelated file changes**
- Identify files in the diff that are in a different package/directory and share no imports with the main changed files.
- Flag as potentially out of scope.

**6.2 Formatting-only changes**
- Identify files where the diff is exclusively whitespace, line breaks, or formatting.
- These should typically be in a separate commit or excluded.

**6.3 Accidental config changes**
- Flag modifications to `tsconfig.json`, `.eslintrc*`, `package.json`, `*.config.*` that aren't obviously related to the task.

**6.4 New dependencies**
- Detect packages added to any `package.json`.
- Flag each with the package name and which workspace it was added to.

---

### Category 7: Structural Hygiene [Requires attention]

These need design judgment. Always flag.

**7.1 Empty modules**
- Flag new files that export nothing and have no side effects.

**7.2 Oversized files**
- Flag new files exceeding ~300 lines.
- Suggest splitting if the file has multiple distinct responsibilities.

**7.3 Duplicated logic**
- Detect near-identical code blocks (5+ similar lines) within the changed files.
- Show both locations.

**7.4 Missing sibling patterns**
- For new files in a directory with established patterns (e.g., every file exports a function with the same shape), flag deviations.

**7.5 Deeply nested logic**
- Flag functions with >3 levels of nesting introduced in the diff.
- Suggest early returns or extraction.

---

## Output Format

### User-Initiated Mode

Present a structured report. Group by category. Use diff blocks for every finding.

```
## Code Cleanliness Review

### Summary

| Category | Issues | Resolution |
|----------|--------|------------|
| Dead Code | 3 | Auto-resolvable |
| Refactoring Completeness | 1 | Auto-resolvable |
| Temporary Artifacts | 2 | Requires attention |
| ... | ... | ... |

### Auto-Resolvable Issues

> These can be fixed mechanically. Say "fix these" to apply.

#### Dead Code

**Unused import `parseConfig` in `lib/config.ts:3`**

 ```diff
 - import { parseConfig, validateConfig } from './parser.js';
 + import { validateConfig } from './parser.js';
 ```

No references to `parseConfig` found in this file.

---

### Requires Attention

> These need human judgment. Review and decide.

#### Temporary Artifacts

**New TODO in `agent/session.ts:142`**

 ```ts
 // TODO: handle reconnection backoff
 ```

Added in this branch. Informational — verify this is intentional or create a ticket.

#### API Surface Changes

**Changed signature of `createSession` in `agent/index.ts:28`**

 ```diff
 - export function createSession(config: SessionConfig): Session
 + export function createSession(config: SessionConfig, opts?: SessionOpts): Session
 ```

Called by 4 files: `app/main.ts:12`, `test/session.test.ts:8`, ...
New optional parameter — non-breaking but consumers should be aware.
```

### Self-Initiated Mode

1. Fix all auto-resolvable issues silently (categories 1, 2, 4).
2. Present a brief summary:

```
## Code Clean Summary

**Auto-resolved (X issues):**
- Removed 2 unused imports (`lib/config.ts`, `transport/http.ts`)
- Completed rename: `oldName` -> `newName` in 1 remaining file
- Fixed file naming: `MyComponent.ts` -> `my-component.ts`

**Requires attention (Y issues):**
- [TODO] `agent/session.ts:142` — `// TODO: handle reconnection backoff`
- [API] `createSession` signature changed — 4 call sites (non-breaking, optional param added)
- [SCOPE] `packages/lib/tsconfig.json` modified — verify this is intentional
```

3. Only fix files that are within the branch's diff scope. Do not touch files that weren't changed in this branch.

## Important Rules

- Do NOT duplicate work that linters and typecheckers catch (import errors, type errors, formatting). Assume CI runs those.
- Do NOT flag pre-existing issues in unchanged code.
- Do NOT flag issues in generated files, lockfiles, or vendored code.
- Be specific: every finding MUST have a `file:line` reference.
- Be honest: if a category has zero findings, skip it entirely. Don't invent problems.
- For self-initiated mode: if there are zero auto-resolvable issues, skip straight to the requires-attention report. If there's nothing at all, just say "Code clean: no issues found" and move on.
- Respect the project's conventions over textbook best practices. Read CLAUDE.md first.
- When performing auto-resolves (renames, reference updates, signature changes), prefer using LSP tools (rename symbol, find references, go to definition) over text-based grep-and-replace wherever an LSP is available for the language. LSP-driven refactoring is more accurate and handles edge cases (re-exports, string vs identifier, shadowed names) that text search cannot.
